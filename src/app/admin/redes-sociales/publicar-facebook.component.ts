import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { IVarianteResumen } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';
import {
  IPublicacionRed,
  LIMITE_ARCHIVO_MB,
  PROGRAMAR_MIN_MINUTOS,
  PlataformaRed
} from 'src/app/redes-sociales/models/publicacion.model';
import { IProgresoPublicacion, RedesSocialesService } from 'src/app/redes-sociales/service/redes-sociales.service';

/**
 * Lo único que se publica desde aquí.
 *
 * ⚠️ **Sin fotos, a propósito** (decisión del dueño, 2026-08-19): a redes solo se suben videos.
 * Con eso desapareció también el paso de "elegir producto" — un video no es de una variante del
 * catálogo, puede ser del local o un saludo. Ver `VARIANTE_OPCIONAL` en el modelo (el back ya
 * dejó `varianteId` opcional en video y Reel).
 */
type TipoVideo = 'video' | 'reel';

@Component({
  selector: 'app-publicar-facebook',
  templateUrl: './publicar-facebook.component.html',
  styleUrls: ['./publicar-facebook.component.scss']
})
export class PublicarFacebookComponent implements OnInit, OnDestroy {

  // ── Contenido a publicar ──────────────────────────────────────────────
  /**
   * A qué redes va ESTA publicación. El archivo se sube **una sola vez** y se manda a cada red
   * marcada — la alternativa (una pestaña por red con su propio botón) obligaría a subir el mismo
   * video tantas veces como redes, y un video pesa.
   *
   * El único límite que queda es de Instagram, y no es decisión nuestra ni del back: ahí no
   * existe el "video de feed", todo video es Reel.
   */
  redesSel: Record<PlataformaRed, boolean> = { facebook: true, instagram: false, tiktok: false };

  /**
   * El texto va **una sola vez** (es el mismo post en todas), y los hashtags **por red**: lo que
   * funciona en Instagram no es lo mismo que en Facebook. Al publicar se concatenan.
   */
  hashtags: Record<PlataformaRed, string> = { facebook: '', instagram: '', tiktok: '' };

  /**
   * Los que están guardados en el servidor para cada red. Se precargan solos al abrir la pantalla
   * — la idea es no reescribir siempre lo mismo — y quedan editables: lo de arriba es lo que se
   * va a publicar HOY, esto es lo que se guardó como fijo.
   */
  hashtagsFijos: Record<PlataformaRed, string> = { facebook: '', instagram: '', tiktok: '' };
  /** Cuál se está guardando ahora — bloquea solo esa red, no la pantalla entera. */
  guardandoFijos: PlataformaRed | null = null;
  /** Si no se pudieron traer, se dice — si no, el admin se queda esperando una precarga que no viene. */
  errorFijos = false;

  tipo: TipoVideo = 'video';
  descripcion = '';

  // ── Producto (opcional) ───────────────────────────────────────────────
  /**
   * De qué producto es el video. **Opcional**: un video del local o un saludo no es de ninguna
   * variante del catálogo.
   *
   * Cuando sí se elige sirve para dos cosas concretas:
   * 1. Su **código de barras encabeza el post** — es lo que le permite a un cliente pedir ese
   *    producto exacto.
   * 2. El **bot de comentarios** del back usa el producto del post como contexto: sin él no
   *    puede contestar si alguien pregunta precio o talla.
   */
  seleccionado: IVarianteResumen | null = null;
  termino = '';
  resultados: IVarianteResumen[] = [];
  buscando = false;
  private input$ = new Subject<string>();

  /** Chuleta de qué acepta cada red — para no tener que recordar por qué una se bloquea. */
  mostrarAyuda = false;

  // Video
  archivoVideo: File | null = null;
  /** SafeUrl para el [src] — Angular 14 bloquea las URLs `blob:` crudas (ver CLAUDE.md). */
  previewVideo: SafeUrl | null = null;
  /** El string crudo, lo único que sirve para `URL.revokeObjectURL`. */
  private previewVideoUrl: string | null = null;

  // ── Programación ──────────────────────────────────────────────────────
  programar = false;
  fechaProgramada = '';

  // ── Envío ─────────────────────────────────────────────────────────────
  publicando = false;
  faseEnvio: 'subiendo' | 'procesando' | null = null;
  progreso = 0;
  /** En cuál va ahora — se muestra en la barra, si no parece colgado al pasar de una a otra. */
  redEnCurso: PlataformaRed | null = null;
  /** Una fila por red: publicó o falló. Ver `publicar()` sobre por qué no es un sí/no global. */
  resultados_pub: { red: PlataformaRed; publicacion?: IPublicacionRed; error?: string }[] = [];

  /**
   * Redes donde este video **ya quedó publicado**. Se conserva aunque se vuelva a editar, para no
   * mandarlo dos veces: un post duplicado en la página real no se puede deshacer desde aquí.
   * Se limpia solo al empezar una publicación nueva.
   */
  yaPublicadas: PlataformaRed[] = [];

  readonly limiteMb = LIMITE_ARCHIVO_MB;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly redes: RedesSocialesService,
    private readonly varianteService: VarianteService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarFijos();

    this.input$.pipe(
      filter(t => t.trim().length >= 2),
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(t => this.buscarProducto(t));
  }

  // ── Buscar el producto ────────────────────────────────────────────────

  onInput(): void { this.input$.next(this.termino); }

  /** El endpoint ya busca en cascada: código de barras primero, luego categoría y nombre. */
  private buscarProducto(termino: string): void {
    this.buscando = true;
    this.varianteService.buscar({ termino, pagina: 1, size: 8 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.resultados = res?.t ?? [];
          this.buscando = false;
        },
        error: err => {
          this.buscando = false;
          this.resultados = [];
          Swal.fire({
            icon: 'error',
            title: 'No se pudo buscar',
            text: err?.error?.mensaje ?? err?.error?.message ?? 'Intenta de nuevo.'
          });
        }
      });
  }

  seleccionarProducto(v: IVarianteResumen): void {
    this.seleccionado = v;
    this.resultados = [];
    this.termino = '';
  }

  quitarProducto(): void {
    this.seleccionado = null;
    this.resultados = [];
    this.termino = '';
  }

  etiqueta(v: IVarianteResumen): string {
    return [v.nombreProducto, v.descripcion, v.talla, v.color]
      .filter(p => !!p && String(p).trim() !== '')
      .join(' · ');
  }

  ngOnDestroy(): void {
    if (this.previewVideoUrl) URL.revokeObjectURL(this.previewVideoUrl);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Hashtags guardados ────────────────────────────────────────────────

  private cargarFijos(): void {
    this.redes.hashtagsDefault().pipe(takeUntil(this.destroy$)).subscribe({
      next: filas => {
        filas.forEach(f => {
          const red = f.redSocial as PlataformaRed;
          if (!this.TODAS.includes(red)) return;
          this.hashtagsFijos[red] = f.hashtags ?? '';
          // Solo se precarga si el campo sigue vacío: si la respuesta tarda y el admin ya
          // alcanzó a teclear, pisárselo sería borrarle lo que escribió.
          if (!this.hashtags[red].trim()) this.hashtags[red] = f.hashtags ?? '';
        });
      },
      // No bloquea nada — sin los fijos igual se escriben a mano; pero sí se avisa, o el admin
      // se queda esperando una precarga que nunca va a llegar.
      error: () => { this.errorFijos = true; }
    });
  }

  /** El PUT reemplaza el valor completo, así que esto sirve igual para agregar, editar y borrar. */
  guardarFijos(r: PlataformaRed): void {
    if (this.guardandoFijos) return;
    this.guardandoFijos = r;

    const texto = (this.hashtags[r] || '').trim();
    this.redes.guardarHashtagsDefault(r, texto).pipe(takeUntil(this.destroy$)).subscribe({
      next: fila => {
        this.hashtagsFijos[r] = fila?.hashtags ?? texto;
        this.guardandoFijos = null;
        Swal.fire({
          icon: 'success',
          title: 'Guardados',
          text: texto
            ? `Los hashtags de ${this.nombreDeRed(r)} se van a precargar solos la próxima vez.`
            : `${this.nombreDeRed(r)} ya no tiene hashtags guardados.`
        });
      },
      error: err => {
        this.guardandoFijos = null;
        Swal.fire({ icon: 'error', title: 'No se pudieron guardar', text: this.msgError(err) });
      }
    });
  }

  /** Devuelve el campo a lo guardado — para deshacer un cambio de un solo post. */
  restaurarFijos(r: PlataformaRed): void {
    this.hashtags[r] = this.hashtagsFijos[r];
  }

  /** `true` si lo que hay escrito ya es exactamente lo guardado: no hay nada que guardar ni deshacer. */
  fijosSinCambios(r: PlataformaRed): boolean {
    return (this.hashtags[r] || '').trim() === (this.hashtagsFijos[r] || '').trim();
  }

  // ── Video ─────────────────────────────────────────────────────────────

  onArchivoVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    if (!this.validarTamano(file)) return;
    this.tomarVideo(file);
  }

  quitarVideo(): void {
    if (this.previewVideoUrl) URL.revokeObjectURL(this.previewVideoUrl);
    this.previewVideoUrl = null;
    this.previewVideo = null;
    this.archivoVideo = null;
  }

  private tomarVideo(file: File): void {
    this.quitarVideo();
    this.archivoVideo = file;
    this.previewVideoUrl = URL.createObjectURL(file);
    // bypass al CREAR, no en el binding: llamarlo desde el template devolvería una
    // instancia nueva en cada ciclo de detección y Angular repintaría sin parar.
    this.previewVideo = this.sanitizer.bypassSecurityTrustUrl(this.previewVideoUrl);
  }

  // ── Arrastrar y soltar ────────────────────────────────────────────────

  /** Solo para pintar el recuadro mientras se arrastra algo encima. */
  arrastrando = false;

  /**
   * `preventDefault` en dragover es **obligatorio**: sin él el navegador no considera la zona
   * como destino válido y al soltar abre el archivo en una pestaña nueva en vez de dárnoslo.
   */
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.publicando) this.arrastrando = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.arrastrando = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.arrastrando = false;
    if (this.publicando) return;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    // Se puede soltar cualquier cosa (un PDF, una carpeta) — hay que revisar qué llegó antes de
    // tratarlo como video, o se subiría basura y el error vendría de Meta mucho después.
    if (!file.type.startsWith('video/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Eso no es un video',
        text: 'Arrastra un archivo de video (MP4, MOV…).'
      });
      return;
    }

    if (!this.validarTamano(file)) return;
    this.tomarVideo(file);
  }

  // ── Pestañas de hashtags ──────────────────────────────────────────────

  /**
   * Qué pestaña se está viendo. El texto del post es uno solo para todas; **lo único que cambia
   * por red son los hashtags**, y por eso son ellos los que viven en pestañas.
   */
  pestana: PlataformaRed = 'facebook';

  verPestana(r: PlataformaRed): void { this.pestana = r; }

  /** La vista previa va detrás de un botón, al final — no estorbando mientras se escribe. */
  mostrarPreview = false;

  togglePreview(): void { this.mostrarPreview = !this.mostrarPreview; }

  private validarTamano(file: File): boolean {
    const mb = file.size / (1024 * 1024);
    if (mb > LIMITE_ARCHIVO_MB) {
      Swal.fire({
        icon: 'warning',
        title: 'El archivo es muy pesado',
        text: `Pesa ${mb.toFixed(1)} MB y el máximo son ${LIMITE_ARCHIVO_MB} MB.`
      });
      return false;
    }
    return true;
  }

  pesoLegible(file: File | null): string {
    if (!file) return '';
    const mb = file.size / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
  }

  // ── Programación ──────────────────────────────────────────────────────

  setTipo(t: TipoVideo): void {
    this.tipo = t;
    this.resultados_pub = [];
    this.sincronizarRestricciones();
  }

  /** Mensaje de error de la fecha, o null si es válida. Mismos límites que valida el back. */
  get errorFecha(): string | null {
    if (!this.programar) return null;
    if (!this.fechaProgramada) return 'Elige la fecha y hora de publicación.';

    const fecha = new Date(this.fechaProgramada);
    if (isNaN(fecha.getTime())) return 'La fecha no es válida.';

    const minimo = new Date(Date.now() + PROGRAMAR_MIN_MINUTOS * 60_000);
    if (fecha < minimo) return `Tiene que ser al menos ${PROGRAMAR_MIN_MINUTOS} minutos en el futuro.`;

    // Ya no hay tope: la programación la hace un job del back, no la API de cada red, así que no
    // aplican sus límites (29 días del Reel de Facebook, 6 meses del video de feed).
    return null;
  }

  /** `datetime-local` entrega `2026-08-05T18:30`; el back espera LocalDateTime con segundos. */
  private fechaISO(): string | null {
    if (!this.programar || !this.fechaProgramada) return null;
    return this.fechaProgramada.length === 16 ? `${this.fechaProgramada}:00` : this.fechaProgramada;
  }

  // ── Redes ─────────────────────────────────────────────────────────────

  readonly TODAS: PlataformaRed[] = ['facebook', 'instagram', 'tiktok'];

  nombreDeRed(r: PlataformaRed): string {
    return r === 'facebook' ? '📘 Facebook' : r === 'instagram' ? '📸 Instagram' : '🎵 TikTok';
  }

  /**
   * Por qué esta red no puede recibir lo que hay armado ahora mismo, o `null` si sí puede.
   *
   * Se devuelve el motivo (no un booleano) para poder mostrarlo junto a la casilla: una casilla
   * apagada sin explicación deja al admin adivinando si es un error o una limitación.
   */
  motivoNoDisponible(r: PlataformaRed): string | null {
    // Ya se publicó ahí con este mismo video: volver a mandarlo dejaría el post duplicado en la
    // página real, y eso no se deshace desde aquí. Se limpia al empezar una publicación nueva.
    if (this.yaPublicadas.includes(r)) {
      return `Este video ya se publicó en ${this.nombreDeRed(r)}. Para mandarlo otra vez, empieza una publicación nueva.`;
    }

    // Instagram no tiene "video de feed": ahí todo video es Reel.
    if (r === 'instagram' && this.tipo === 'video') {
      return 'Para video en Instagram usa Reel (el video de feed no aplica).';
    }
    return null;
  }

  /**
   * Aviso que NO impide publicar, a diferencia de `motivoNoDisponible`. Hoy solo TikTok: mientras
   * su app siga en Sandbox el video sale privado, y eso hay que decirlo antes de publicar o el
   * admin va a creer que salió mal.
   */
  advertenciaDe(r: PlataformaRed): string | null {
    return r === 'tiktok'
      ? 'Mientras TikTok no apruebe la app, el video se sube como privado y solo lo ves tú.'
      : null;
  }

  puedeUsar(r: PlataformaRed): boolean { return this.motivoNoDisponible(r) === null; }

  toggleRed(r: PlataformaRed): void {
    if (!this.puedeUsar(r) || this.publicando) return;
    this.redesSel[r] = !this.redesSel[r];
    this.resultados_pub = [];
    this.sincronizarRestricciones();
  }

  /** Las redes marcadas que de verdad pueden recibir lo que hay armado. */
  get redesActivas(): PlataformaRed[] {
    return this.TODAS.filter(r => this.redesSel[r] && this.puedeUsar(r));
  }

  /**
   * Si el contenido cambia (p. ej. se pasa de Reel a video), una red marcada puede dejar de poder
   * recibirlo. Se desmarca sola: si no, el admin creería que se publicó ahí.
   */
  sincronizarRestricciones(): void {
    this.TODAS.forEach(r => { if (this.redesSel[r] && !this.puedeUsar(r)) this.redesSel[r] = false; });

    if (!this.puedeProgramar) { this.programar = false; this.fechaProgramada = ''; }
  }

  /**
   * **Se puede programar en las 3 redes y en los dos tipos.** El back lo hace con un job propio,
   * no con el scheduler de cada plataforma — por eso ya no aplica ninguna de sus limitaciones
   * (Instagram no lo permitía, el Reel de Facebook tampoco) ni sus topes de fecha.
   *
   * Se deja como getter, y no como `true` fijo, porque es el punto natural donde volver a
   * restringir si alguna red cambia de reglas.
   */
  get puedeProgramar(): boolean {
    return this.redesActivas.length > 0;
  }

  /**
   * Lo que de verdad se va a publicar en esa red, en este orden:
   *
   * 1. **El código de barras**, solo en su renglón — así queda a la vista para pedir ese producto
   *    exacto. Solo aparece si se eligió producto.
   * 2. El **texto del post**, el mismo para todas las redes.
   * 3. Los **hashtags de esa red**, separados por un renglón en blanco.
   */
  textoFinal(r: PlataformaRed): string {
    const cuerpo = [
      this.seleccionado?.codigoBarras?.trim(),
      this.descripcion.trim()
    ].filter(p => !!p).join('\n');

    const tags = (this.hashtags[r] || '').trim();
    return tags ? `${cuerpo}\n\n${tags}` : cuerpo;
  }

  get puedePublicar(): boolean {
    if (this.publicando) return false;
    if (!this.descripcion.trim()) return false;
    if (!this.archivoVideo) return false;
    if (this.errorFecha) return false;
    return this.redesActivas.length > 0;
  }

  // ── Publicar ──────────────────────────────────────────────────────────

  /**
   * Publica en cada red marcada, **una tras otra**.
   *
   * ⚠️ Secuencial a propósito, no en paralelo: cada red es un request independiente contra su API
   * y **una puede fallar mientras la otra funciona**. Con `forkJoin` un solo fallo cancelaría el
   * resto y no se sabría qué llegó a publicarse. Por eso el resultado es una lista por red, no un
   * sí/no global.
   */
  publicar(): void {
    if (!this.puedePublicar) return;

    this.publicando = true;
    this.faseEnvio = 'subiendo';
    this.progreso = 0;
    this.resultados_pub = [];

    this.pendientes = [...this.redesActivas];
    this.siguienteRed();
  }

  private pendientes: PlataformaRed[] = [];

  private siguienteRed(): void {
    const red = this.pendientes.shift();
    if (!red) {
      this.publicando = false;
      this.faseEnvio = null;
      this.avisarResultado();
      return;
    }

    this.redEnCurso = red;
    this.progreso = 0;

    // `varianteId` va solo si se eligió producto — el back ya lo acepta nulo
    // (ver `VARIANTE_OPCIONAL`), y el servicio omite el part cuando no hay.
    const base = {
      varianteId: this.seleccionado?.id ?? null,
      descripcion: this.textoFinal(red),
      video: this.archivoVideo!,
      scheduledPublishTime: this.fechaISO()
    };

    if (red === 'instagram') {
      // Solo Reel: `motivoNoDisponible` ya impide llegar aquí con "video de feed".
      this.conProgreso(red, this.redes.publicarReelInstagram(base));
      return;
    }

    if (red === 'tiktok') {
      // Su API no distingue Reel de video: todo es un video vertical.
      this.conProgreso(red, this.redes.publicarTikTok(base));
      return;
    }

    // Facebook. Los dos tipos aceptan `scheduledPublishTime` desde que el back lo hace con su
    // propio job y no con el scheduler de Meta.
    this.conProgreso(red,
      this.tipo === 'reel'
        ? this.redes.publicarReelFacebook(base)
        : this.redes.publicarVideo(base)
    );
  }

  /** Suscripción común de los endpoints que suben archivo: avanza la barra y pasa a la red siguiente. */
  private conProgreso(red: PlataformaRed, peticion$: Observable<IProgresoPublicacion>): void {
    peticion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: ev => {
        this.progreso = ev.porcentaje;
        if (ev.tipo === 'listo') {
          this.resultados_pub.push({ red, publicacion: ev.publicacion ?? undefined });
          // `PROGRAMADA` también cuenta como ya mandada: el job del back la va a publicar sola,
          // así que reintentarla dejaría dos posts.
          const fallida = ev.publicacion?.estado === 'FALLIDA';
          if (!fallida && !this.yaPublicadas.includes(red)) this.yaPublicadas.push(red);
          this.siguienteRed();
        } else {
          this.faseEnvio = ev.tipo;
        }
      },
      error: err => { this.resultados_pub.push({ red, error: this.msgError(err) }); this.siguienteRed(); }
    });
  }

  private avisarResultado(): void {
    const ok = this.resultados_pub.filter(r => !r.error);
    const mal = this.resultados_pub.filter(r => r.error);

    if (mal.length === 0) {
      const programada = ok.some(r => r.publicacion?.estado === 'PROGRAMADA');
      Swal.fire({
        icon: 'success',
        title: programada ? '📅 Programada' : `✅ Publicado en ${ok.length === 1 ? '1 red' : ok.length + ' redes'}`,
        text: programada ? 'Se publicará en la fecha que elegiste.' : 'Ya está publicado.'
      });
      return;
    }

    // Se dice exactamente dónde sí y dónde no: un "hubo un error" a secas dejaría al admin sin
    // saber si tiene que volver a intentar en todas o solo en una. Y se aclara de una vez que
    // no perdió el video, que es lo primero que preocupa cuando algo falla.
    Swal.fire({
      icon: ok.length ? 'warning' : 'error',
      title: ok.length ? 'Se publicó en algunas' : 'No se pudo publicar',
      html: [
        ...ok.map(r => `<p style="margin:4px 0">✅ <b>${this.nombreDeRed(r.red)}</b> — listo</p>`),
        ...mal.map(r => `<p style="margin:4px 0;text-align:left">❌ <b>${this.nombreDeRed(r.red)}</b><br><small>${r.error}</small></p>`),
        `<p style="margin:10px 0 0;font-size:.85rem;opacity:.8">Tu video y tu texto siguen aquí — puedes reintentar solo ${mal.length === 1 ? 'la que falló' : 'las que fallaron'} sin volver a subir nada.</p>`
      ].join('')
    });
  }

  /** El back manda el 400 con `mensaje` en español ya listo para mostrar. */
  private msgError(err: any): string {
    return err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo publicar.';
  }

  formatoFecha(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-MX');
  }

  /**
   * ⚠️ El id de Instagram viaja en el MISMO campo `postIdFacebook` (el back no agregó uno nuevo
   * para no romper el contrato), así que hay que mirar `plataforma` — si no, un post de Instagram
   * llevaría a un link de Facebook que no existe.
   */
  linkDe(pub: IPublicacionRed | undefined): string | null {
    if (!pub?.postIdFacebook) return null;
    return pub.plataforma === 'instagram'
      ? `https://www.instagram.com/p/${pub.postIdFacebook}`
      : `https://www.facebook.com/${pub.postIdFacebook}`;
  }

  get huboResultado(): boolean { return this.resultados_pub.length > 0; }

  // ── Reintentar sin perder nada ────────────────────────────────────────

  /**
   * Las que no salieron: error de red/API, o `FALLIDA` (el job del back agotó sus 3 reintentos).
   * Las `PROGRAMADA` **no** cuentan — todavía no han fallado, están esperando su hora.
   */
  get redesFallidas(): PlataformaRed[] {
    return this.resultados_pub
      .filter(r => !!r.error || r.publicacion?.estado === 'FALLIDA')
      .map(r => r.red);
  }

  /**
   * Reintenta **solo las que fallaron**, con el mismo archivo y el mismo texto — no hay que volver
   * a subir el video ni reescribir los hashtags.
   *
   * ⚠️ Las que sí salieron se conservan en la lista y **no se vuelven a mandar**: republicarlas
   * dejaría el post duplicado en la página real.
   */
  reintentarFallidas(): void {
    const fallidas = this.redesFallidas;
    if (!fallidas.length || this.publicando) return;

    if (!this.archivoVideo) {
      Swal.fire({
        icon: 'warning',
        title: 'Ya no está el video',
        text: 'Vuelve a cargarlo para poder reintentar.'
      });
      return;
    }

    // Se quitan solo las fallidas: las buenas siguen a la vista mientras corre el reintento.
    this.resultados_pub = this.resultados_pub.filter(r => !fallidas.includes(r.red));

    this.publicando = true;
    this.faseEnvio = 'subiendo';
    this.progreso = 0;
    this.pendientes = [...fallidas];
    this.siguienteRed();
  }

  /**
   * Vuelve al formulario **sin perder nada** — para cuando el error se arregla cambiando algo
   * (el texto, el tipo, la fecha). Lo ya publicado queda registrado en `yaPublicadas` y esas
   * redes se desmarcan solas, para no mandar el mismo video dos veces.
   */
  volverAEditar(): void {
    if (this.publicando) return;
    this.yaPublicadas.forEach(r => { this.redesSel[r] = false; });
    this.resultados_pub = [];
    this.progreso = 0;
    this.redEnCurso = null;
    this.sincronizarRestricciones();
  }

  /** Empieza de cero. Pregunta antes: es lo único que descarta el video. */
  nuevaPublicacion(): void {
    if (this.publicando) return;

    const limpiar = () => {
      this.resultados_pub = [];
      this.yaPublicadas = [];
      this.progreso = 0;
      this.redEnCurso = null;
      this.quitarVideo();
      this.quitarProducto();
    };

    if (!this.archivoVideo) { limpiar(); return; }

    Swal.fire({
      icon: 'question',
      title: '¿Empezar de cero?',
      text: 'Se va a quitar el video y tendrás que cargarlo otra vez. El texto y los hashtags se quedan.',
      showCancelButton: true,
      confirmButtonText: 'Sí, empezar de cero',
      cancelButtonText: 'Cancelar'
    }).then(res => { if (res.isConfirmed) limpiar(); });
  }
}
