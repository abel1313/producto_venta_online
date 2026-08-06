import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { IVarianteImagenDto, IVarianteResumen } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';
import {
  IPublicacionRed,
  LIMITE_ARCHIVO_MB,
  PROGRAMAR_MAX_MESES,
  PROGRAMAR_MIN_MINUTOS,
  TipoPublicacion
} from 'src/app/redes-sociales/models/publicacion.model';
import { RedesSocialesService } from 'src/app/redes-sociales/service/redes-sociales.service';

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
  resultado: IPublicacionRed | null = null;

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
    this.resultado = null;
    this.descripcion = this.descripcionSugerida(v);
    this.reiniciarImagen();
    this.cargarImagenesGuardadas(v.id);
  }

  limpiarSeleccion(): void {
    this.seleccionado = null;
    this.descripcion = '';
    this.imagenesGuardadas = [];
    this.resultado = null;
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
    this.resultado = null;
  }

  /** Mensaje de error de la fecha, o null si es válida. Mismos límites que valida el back. */
  get errorFecha(): string | null {
    if (!this.programar) return null;
    if (!this.fechaProgramada) return 'Elige la fecha y hora de publicación.';

    const fecha = new Date(this.fechaProgramada);
    if (isNaN(fecha.getTime())) return 'La fecha no es válida.';

    const minimo = new Date(Date.now() + PROGRAMAR_MIN_MINUTOS * 60_000);
    if (fecha < minimo) return `Tiene que ser al menos ${PROGRAMAR_MIN_MINUTOS} minutos en el futuro.`;

    const maximo = new Date();
    maximo.setMonth(maximo.getMonth() + PROGRAMAR_MAX_MESES);
    if (fecha > maximo) return `No puede ser a más de ${PROGRAMAR_MAX_MESES} meses.`;

    return null;
  }

  /** `datetime-local` entrega `2026-08-05T18:30`; el back espera LocalDateTime con segundos. */
  private fechaISO(): string | null {
    if (!this.programar || !this.fechaProgramada) return null;
    return this.fechaProgramada.length === 16 ? `${this.fechaProgramada}:00` : this.fechaProgramada;
  }

  // ── Publicar ──────────────────────────────────────────────────────────

  get puedePublicar(): boolean {
    if (this.publicando || !this.seleccionado) return false;
    if (!this.descripcion.trim()) return false;
    if (this.errorFecha) return false;

    if (this.tipo === 'video') return !!this.archivoVideo;

    // Foto: hay que tener de dónde sacarla.
    if (this.origenImagen === 'nueva')    return !!this.archivoImagen;
    if (this.origenImagen === 'guardada') return !!this.imagenIdSel;
    return this.tieneImagenPrincipal;
  }

  publicar(): void {
    if (!this.puedePublicar || !this.seleccionado) return;

    this.publicando = true;
    this.faseEnvio = 'subiendo';
    this.progreso = 0;
    this.resultado = null;

    const base = {
      varianteId: this.seleccionado.id,
      descripcion: this.descripcion.trim(),
      scheduledPublishTime: this.fechaISO()
    };

    const peticion$ = this.tipo === 'video'
      ? this.redes.publicarVideo({ ...base, video: this.archivoVideo! })
      : this.redes.publicarFoto({
          ...base,
          imagenNueva: this.origenImagen === 'nueva'    ? this.archivoImagen : null,
          imagenId:    this.origenImagen === 'guardada' ? this.imagenIdSel   : null
        });

    peticion$.pipe(takeUntil(this.destroy$)).subscribe({
      next: ev => {
        this.progreso = ev.porcentaje;
        if (ev.tipo === 'listo') {
          this.publicando = false;
          this.faseEnvio = null;
          this.resultado = ev.publicacion ?? null;
          const programada = this.resultado?.estado === 'PROGRAMADA';
          Swal.fire({
            icon: 'success',
            title: programada ? '📅 Publicación programada' : '✅ Publicado en Facebook',
            text: programada
              ? `Se publicará el ${this.formatoFecha(this.resultado?.scheduledPublishTime)}.`
              : 'Ya está publicado en la página.'
          });
        } else {
          this.faseEnvio = ev.tipo;
        }
      },
      error: err => {
        this.publicando = false;
        this.faseEnvio = null;
        this.progreso = 0;
        // El back manda el 400 con `mensaje` en español ya listo para mostrar.
        Swal.fire({
          icon: 'error',
          title: 'No se pudo publicar',
          text: err?.error?.mensaje ?? err?.error?.message ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  formatoFecha(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-MX');
  }

  get linkPost(): string | null {
    return this.resultado?.postIdFacebook
      ? `https://www.facebook.com/${this.resultado.postIdFacebook}`
      : null;
  }

  nuevaPublicacion(): void {
    this.resultado = null;
    this.progreso = 0;
  }

  private revocarPreviews(): void {
    if (this.previewImagenUrl) URL.revokeObjectURL(this.previewImagenUrl);
    if (this.previewVideoUrl)  URL.revokeObjectURL(this.previewVideoUrl);
  }
}
