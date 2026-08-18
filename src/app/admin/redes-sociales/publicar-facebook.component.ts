import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { IVarianteImagenDto, IVarianteResumen } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';
import {
  IPublicacionRed,
  LIMITE_ARCHIVO_MB,
  PROGRAMAR_MIN_MINUTOS,
  PlataformaRed,
  TipoPublicacion
} from 'src/app/redes-sociales/models/publicacion.model';
import { IProgresoPublicacion, RedesSocialesService } from 'src/app/redes-sociales/service/redes-sociales.service';

type OrigenImagen = 'principal' | 'guardada' | 'nueva';

@Component({
  selector: 'app-publicar-facebook',
  templateUrl: './publicar-facebook.component.html',
  styleUrls: ['./publicar-facebook.component.scss']
})
export class PublicarFacebookComponent implements OnInit, OnDestroy {

  // ── Buscador de producto ──────────────────────────────────────────────
  termino = '';
  resultados: IVarianteResumen[] = [];
  buscando = false;
  private input$ = new Subject<string>();

  seleccionado: IVarianteResumen | null = null;

  // ── Contenido a publicar ──────────────────────────────────────────────
  /**
   * A qué redes va ESTA publicación. El archivo se sube **una sola vez** y se manda a cada red
   * marcada — la alternativa (una pestaña por red con su propio botón) obligaría a subir el mismo
   * video tantas veces como redes, y un video pesa.
   *
   * Cada red tiene sus propios límites, y **ninguno es decisión nuestra ni del back**:
   * - Instagram exige una URL pública, así que no acepta archivo suelto ni video de feed.
   * - TikTok solo acepta video, su API no publica fotos.
   */
  redesSel: Record<PlataformaRed, boolean> = { facebook: true, instagram: false, tiktok: false };

  /**
   * El texto va **una sola vez** (es el mismo post en todas), y los hashtags **por red**: lo que
   * funciona en Instagram no es lo mismo que en Facebook. Al publicar se concatenan.
   */
  hashtags: Record<PlataformaRed, string> = { facebook: '', instagram: '', tiktok: '' };

  tipo: TipoPublicacion = 'foto';
  descripcion = '';

  // Foto
  origenImagen: OrigenImagen = 'principal';
  imagenesGuardadas: IVarianteImagenDto[] = [];
  cargandoImagenes = false;
  imagenIdSel: string | null = null;
  archivoImagen: File | null = null;
  /** SafeUrl para el [src] — Angular 14 bloquea las URLs `blob:` crudas (ver CLAUDE.md). */
  previewImagen: SafeUrl | null = null;
  /** El string crudo, lo único que sirve para `URL.revokeObjectURL`. */
  private previewImagenUrl: string | null = null;

  // Video
  archivoVideo: File | null = null;
  previewVideo: SafeUrl | null = null;
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

  readonly limiteMb = LIMITE_ARCHIVO_MB;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly varianteService: VarianteService,
    private readonly redes: RedesSocialesService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.input$.pipe(
      filter(t => t.trim().length >= 2),
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(t => this.buscar(t));
  }

  ngOnDestroy(): void {
    this.revocarPreviews();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────

  onInput(): void { this.input$.next(this.termino); }

  private buscar(termino: string): void {
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

  seleccionar(v: IVarianteResumen): void {
    this.seleccionado = v;
    this.resultados = [];
    this.termino = '';
    this.resultados_pub = [];
    // Solo se sugiere el texto si todavía no hay nada escrito. Ahora que el formulario se ve
    // completo desde el inicio, el admin puede escribir ANTES de elegir el producto — pisarle lo
    // que ya redactó sería perder su trabajo sin avisar.
    if (!this.descripcion.trim()) this.descripcion = this.descripcionSugerida(v);
    this.reiniciarImagen();
    this.cargarImagenesGuardadas(v.id);
  }

  limpiarSeleccion(): void {
    this.seleccionado = null;
    this.descripcion = '';
    this.imagenesGuardadas = [];
    this.resultados_pub = [];
    this.reiniciarImagen();
    this.quitarVideo();
  }

  etiqueta(v: IVarianteResumen): string {
    return [v.nombreProducto, v.descripcion, v.talla, v.color]
      .filter(p => !!p && String(p).trim() !== '')
      .join(' · ');
  }

  /**
   * Sugerencia editable. Incluye el código de barras porque es lo que le permite a un
   * cliente pedir ese producto exacto — pero queda visible en un post público, así que
   * la pantalla lo avisa y el admin puede borrarlo antes de publicar.
   */
  private descripcionSugerida(v: IVarianteResumen): string {
    const partes: string[] = [];
    if (v.nombreProducto) partes.push(v.nombreProducto);
    if (v.descripcion && v.descripcion !== v.nombreProducto) partes.push(v.descripcion);

    const atributos = [
      v.talla  ? `Talla: ${v.talla}`   : null,
      v.color  ? `Color: ${v.color}`   : null,
      v.marca  ? `Marca: ${v.marca}`   : null
    ].filter(Boolean).join(' · ');

    let texto = partes.join(' — ');
    if (atributos) texto += `\n${atributos}`;
    if (v.precio != null) texto += `\nPrecio: $${v.precio}`;
    if (v.codigoBarras) texto += `\nCódigo: ${v.codigoBarras}`;
    return texto;
  }

  // ── Imágenes ──────────────────────────────────────────────────────────

  private cargarImagenesGuardadas(varianteId: number): void {
    this.cargandoImagenes = true;
    this.varianteService.getImagenesVariante(varianteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: imgs => {
          this.imagenesGuardadas = imgs ?? [];
          this.cargandoImagenes = false;
        },
        // Falla en silencio a propósito: sin esta lista el admin igual puede publicar
        // con la imagen principal o subiendo una nueva. No vale bloquear la pantalla.
        error: () => {
          this.imagenesGuardadas = [];
          this.cargandoImagenes = false;
        }
      });
  }

  get tieneImagenPrincipal(): boolean {
    return !!this.seleccionado?.imagenUrl;
  }

  setOrigenImagen(origen: OrigenImagen): void {
    this.origenImagen = origen;
    if (origen !== 'guardada') this.imagenIdSel = null;
    if (origen !== 'nueva')    this.quitarImagenNueva();
  }

  elegirGuardada(img: IVarianteImagenDto): void {
    this.imagenIdSel = img.id ?? null;
  }

  onArchivoImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    if (!this.validarTamano(file)) return;

    this.quitarImagenNueva();
    this.archivoImagen = file;
    this.previewImagenUrl = URL.createObjectURL(file);
    // bypass al CREAR, no en el binding: llamarlo desde el template devolvería una
    // instancia nueva en cada ciclo de detección y Angular repintaría sin parar.
    this.previewImagen = this.sanitizer.bypassSecurityTrustUrl(this.previewImagenUrl);
    this.origenImagen = 'nueva';
  }

  quitarImagenNueva(): void {
    if (this.previewImagenUrl) URL.revokeObjectURL(this.previewImagenUrl);
    this.previewImagenUrl = null;
    this.previewImagen = null;
    this.archivoImagen = null;
  }

  private reiniciarImagen(): void {
    this.origenImagen = 'principal';
    this.imagenIdSel = null;
    this.quitarImagenNueva();
  }

  // ── Video ─────────────────────────────────────────────────────────────

  onArchivoVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!this.validarTamano(file)) return;

    this.quitarVideo();
    this.archivoVideo = file;
    this.previewVideoUrl = URL.createObjectURL(file);
    this.previewVideo = this.sanitizer.bypassSecurityTrustUrl(this.previewVideoUrl);
  }

  quitarVideo(): void {
    if (this.previewVideoUrl) URL.revokeObjectURL(this.previewVideoUrl);
    this.previewVideoUrl = null;
    this.previewVideo = null;
    this.archivoVideo = null;
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

    this.quitarVideo();
    this.archivoVideo = file;
    this.previewVideoUrl = URL.createObjectURL(file);
    this.previewVideo = this.sanitizer.bypassSecurityTrustUrl(this.previewVideoUrl);
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

  setTipo(t: TipoPublicacion): void {
    this.tipo = t;
    this.resultados_pub = [];
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

  // ── Publicar ──────────────────────────────────────────────────────────

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
    if (r === 'tiktok') {
      // Su API no tiene "publicar foto" — solo video.
      if (this.tipo === 'foto') return 'TikTok solo acepta video, no fotos.';
    }

    if (r === 'instagram') {
      if (this.tipo === 'video')         return 'Para video en Instagram usa Reel (el video de feed no aplica).';
      if (this.origenImagen === 'nueva' && this.tipo === 'foto')
        return 'Instagram necesita una foto que ya esté guardada en el producto.';
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
   * Si el contenido cambia (p. ej. se pasa a video), una red marcada puede dejar de poder
   * recibirlo. Se desmarca sola: si no, el admin creería que se publicó ahí.
   */
  sincronizarRestricciones(): void {
    this.TODAS.forEach(r => { if (this.redesSel[r] && !this.puedeUsar(r)) this.redesSel[r] = false; });

    if (!this.puedeProgramar) { this.programar = false; this.fechaProgramada = ''; }
  }

  /**
   * **Ahora se puede programar en las 3 redes y en cualquier tipo.** El back lo hace con un job
   * propio, no con el scheduler de cada plataforma — por eso ya no aplica ninguna de sus
   * limitaciones (Instagram no lo permitía, el Reel de Facebook tampoco) ni sus topes de fecha.
   *
   * Se deja como getter, y no como `true` fijo, porque es el punto natural donde volver a
   * restringir si alguna red cambia de reglas.
   */
  get puedeProgramar(): boolean {
    return this.redesActivas.length > 0;
  }

  /** Lo que de verdad se va a publicar en esa red: el texto común + sus propios hashtags. */
  textoFinal(r: PlataformaRed): string {
    const tags = (this.hashtags[r] || '').trim();
    const base = this.descripcion.trim();
    return tags ? `${base}\n\n${tags}` : base;
  }

  get puedePublicar(): boolean {
    if (this.publicando || !this.seleccionado) return false;
    if (!this.descripcion.trim()) return false;
    if (this.errorFecha) return false;
    if (this.redesActivas.length === 0) return false;

    // Video y Reel comparten el mismo archivo — el catálogo no guarda ninguno, siempre se sube.
    if (this.tipo !== 'foto') return !!this.archivoVideo;

    // Foto: hay que tener de dónde sacarla.
    if (this.origenImagen === 'nueva')    return !!this.archivoImagen;
    if (this.origenImagen === 'guardada') return !!this.imagenIdSel;
    return this.tieneImagenPrincipal;
  }

  /**
   * Publica en cada red marcada, **una tras otra**.
   *
   * ⚠️ Secuencial a propósito, no en paralelo: cada red es un request independiente contra Meta y
   * **una puede fallar mientras la otra funciona** (el caso real de hoy: Facebook publica bien e
   * Instagram devuelve 400 porque la cuenta no está vinculada). Con `forkJoin` un solo fallo
   * cancelaría el resto y no se sabría qué llegó a publicarse. Por eso el resultado es una lista
   * por red, no un sí/no global.
   */
  publicar(): void {
    if (!this.puedePublicar || !this.seleccionado) return;

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
    if (!red || !this.seleccionado) {
      this.publicando = false;
      this.faseEnvio = null;
      this.avisarResultado();
      return;
    }

    this.redEnCurso = red;
    this.progreso = 0;

    const descripcion = this.textoFinal(red);
    const varianteId = this.seleccionado.id;
    const scheduledPublishTime = this.fechaISO();

    if (red === 'instagram') {
      // El Reel SÍ manda archivo (multipart, endpoint aparte), así que tiene barra de progreso
      // como el video de Facebook. La foto no: usa una URL pública y es un request chico.
      if (this.tipo === 'reel') {
        this.conProgreso(red, this.redes.publicarReelInstagram({
          varianteId, descripcion, video: this.archivoVideo!, scheduledPublishTime
        }));
        return;
      }

      this.faseEnvio = 'procesando';
      this.redes.publicarInstagram({
        varianteId,
        descripcion,
        imagenId: this.origenImagen === 'guardada' ? this.imagenIdSel : null,
        scheduledPublishTime
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: pub => { this.resultados_pub.push({ red, publicacion: pub }); this.siguienteRed(); },
        error: err => { this.resultados_pub.push({ red, error: this.msgError(err) }); this.siguienteRed(); }
      });
      return;
    }

    if (red === 'tiktok') {
      // Solo video: su API no publica fotos, y `motivoNoDisponible` ya impide llegar aquí con foto.
      this.conProgreso(red, this.redes.publicarTikTok({
        varianteId, descripcion, video: this.archivoVideo!, scheduledPublishTime
      }));
      return;
    }

    // Facebook. Los 3 tipos aceptan `scheduledPublishTime` desde que el back lo hace con su
    // propio job y no con el scheduler de Meta.
    const base = { varianteId, descripcion, scheduledPublishTime };

    this.conProgreso(red,
      this.tipo === 'reel'
        ? this.redes.publicarReelFacebook({ ...base, video: this.archivoVideo! })
        : this.tipo === 'video'
          ? this.redes.publicarVideo({ ...base, video: this.archivoVideo! })
          : this.redes.publicarFoto({
              ...base,
              imagenNueva: this.origenImagen === 'nueva'    ? this.archivoImagen : null,
              imagenId:    this.origenImagen === 'guardada' ? this.imagenIdSel   : null
            })
    );
  }

  /** Suscripción común de los endpoints que suben archivo: avanza la barra y pasa a la red siguiente. */
  private conProgreso(red: PlataformaRed, peticion$: Observable<IProgresoPublicacion>): void {
    peticion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: ev => {
        this.progreso = ev.porcentaje;
        if (ev.tipo === 'listo') {
          this.resultados_pub.push({ red, publicacion: ev.publicacion ?? undefined });
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
    // saber si tiene que volver a intentar en todas o solo en una.
    Swal.fire({
      icon: ok.length ? 'warning' : 'error',
      title: ok.length ? 'Se publicó en algunas' : 'No se pudo publicar',
      html: [
        ...ok.map(r => `<p style="margin:4px 0">✅ <b>${this.nombreDeRed(r.red)}</b> — listo</p>`),
        ...mal.map(r => `<p style="margin:4px 0;text-align:left">❌ <b>${this.nombreDeRed(r.red)}</b><br><small>${r.error}</small></p>`)
      ].join('')
    });
  }

  /** El back manda el 400 con `mensaje` en español ya listo para mostrar — incluido el
   *  "Instagram no esta configurado" que va a salir hasta que se vincule la cuenta. */
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

  nuevaPublicacion(): void {
    this.resultados_pub = [];
    this.progreso = 0;
    this.redEnCurso = null;
  }

  private revocarPreviews(): void {
    if (this.previewImagenUrl) URL.revokeObjectURL(this.previewImagenUrl);
    if (this.previewVideoUrl)  URL.revokeObjectURL(this.previewVideoUrl);
  }
}
