import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, EMPTY, of } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { IVarianteRequest } from '../models/variante.model';
import { IStockDisponible } from '../models/stock-disponible.model';
import { VarianteService } from '../service/variante.service';
// Nuevo — palabra clave para categorizar todas las variantes del lote
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';

interface TallaNumeral {
  num: number;
  checked: boolean;
  stock: number;
}

interface TallaLetra {
  id: number;
  talla: string;
  checked: boolean;
  stock: number;
}

interface VarianteExtra {
  talla: string;
  source: 'numerica' | 'letra';
  form: FormGroup;
}

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.component.html',
  styleUrls: ['./agregar.component.scss']
})
export class AgregarComponent implements OnInit, OnDestroy {

  @ViewChild('canvasRef')   canvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput')   fileInputRef!:   ElementRef<HTMLInputElement>;
  @ViewChild('videoCamara') videoCamaraRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCamara') canvasCamaraRef!: ElementRef<HTMLCanvasElement>;

  form!: FormGroup;
  guardando = false;

  // Búsqueda de producto
  terminoProducto = '';
  productos: IProductoDTO[] = [];
  productoSeleccionado: IProductoDTO | null = null;
  private busquedaSubject = new Subject<string>();

  // Imágenes (compartidas con todas las variantes)
  imagenesCargadas: IImagenDto[] = [];
  mostrandoCamara = false;
  private mediaStream: MediaStream | null = null;
  private readonly TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif'];
  private readonly DIMENSION_MAX = 1280;
  private readonly CALIDAD_JPEG = 0.8;
  // Nuevo — palabra clave que se aplica a todo el lote de variantes
  palabraClaveSeleccionada: IPalabraClave | null = null;

  // ── Modal tallas numéricas (1-50) ─────────────────────────────────
  modalNumVisible = false;
  tallasNum: TallaNumeral[] = Array.from({ length: 50 }, (_, i) => ({
    num: i + 1,
    checked: false,
    stock: 0
  }));

  // ── Modal tallas por letras ────────────────────────────────────────
  modalLetraVisible = false;
  readonly LETRAS_BASE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  tallasLetras: TallaLetra[] = [];
  private letraNextId = 0;

  // ── Variantes extra (de ambos modales) ────────────────────────────
  variantesExtras: VarianteExtra[] = [];

  get numSeleccionados(): number { return this.tallasNum.filter(t => t.checked).length; }
  get letrasSeleccionadas(): number { return this.tallasLetras.filter(t => t.checked).length; }
  get totalExtras(): number { return this.variantesExtras.length; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly varianteService: VarianteService,
    private readonly productoService: ProductoService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      talla:        [''],
      color:        [''],
      presentacion: [''],
      stock:        [null],
      descripcion:  [''],
      marca:        [''],
      contenidoNeto:[''],
    });

    this.busquedaSubject.pipe(
      debounceTime(350),
      switchMap((t: string) => t.length < 3
        ? (this.productos = [], EMPTY)
        // El catchError va DENTRO del switchMap a proposito: el back contesta 404/400 cuando la
        // busqueda no encuentra nada, y si ese error sube al subscribe la suscripcion se termina
        // para siempre -- el buscador quedaba muerto y solo revivia recargando la pantalla
        // (reportado en QA: "no hubo producto, busque otra cosa y ya no hace ni la peticion").
        : this.productoService.getDataNombreCodigoBarra(1, 10, t).pipe(
            catchError(() => of(null))
          ))
    ).subscribe({ next: res => { this.productos = res?.t ?? []; } });
  }

  // ── Búsqueda de producto ───────────────────────────────────────────

  onBuscarProducto(event: KeyboardEvent): void {
    this.busquedaSubject.next((event.target as HTMLInputElement).value);
  }

  seleccionarProducto(p: IProductoDTO): void {
    this.productoSeleccionado = p;
    this.terminoProducto = p.nombre;
    this.productos = [];
    this.cargarStockDisponible();
  }

  limpiarProducto(): void {
    this.productoSeleccionado = null;
    this.terminoProducto = '';
    this.productos = [];
    this.stockDisponible = null;
  }

  // ── Stock disponible del modelo ────────────────────────────────────
  // Sin esto el admin reparte stock a ciegas y se pasa del total del producto: así nacieron
  // los descuadres (el 269: 12 en total, sus modelos suman 18).

  stockDisponible: IStockDisponible | null = null;
  cargandoStock = false;

  private cargarStockDisponible(): void {
    const id = this.productoSeleccionado?.idProducto;
    if (!id) { this.stockDisponible = null; return; }

    this.cargandoStock = true;
    this.varianteService.stockDisponible(id).subscribe({
      next: s => { this.stockDisponible = s; this.cargandoStock = false; },
      // Si no se puede leer, no se bloquea el alta: el back valida igual al guardar. Solo se
      // pierde la ayuda visual.
      error: () => { this.stockDisponible = null; this.cargandoStock = false; }
    });
  }

  /** Lo que ya se está por repartir en esta pantalla, sumando el base y las tallas. */
  get stockEnEstaPantalla(): number {
    const base = this.baseDescribeAlgo ? (Number(this.form.value?.stock) || 0) : 0;
    return base + this.variantesExtras.reduce((t, e) => t + (Number(e.form.value?.stock) || 0), 0);
  }

  /** Se pasó de lo que queda libre. El back lo rechaza igual; esto avisa antes de escribir. */
  get seEstaPasandoDeStock(): boolean {
    return this.stockDisponible != null
        && this.stockEnEstaPantalla > this.stockDisponible.disponible;
  }

  // ── Modal tallas numéricas ─────────────────────────────────────────

  abrirModalNum(): void { this.modalNumVisible = true; }
  cerrarModalNum(): void { this.modalNumVisible = false; }

  confirmarModalNum(): void {
    const seleccionadas = this.tallasNum.filter(t => t.checked);
    const mainVal = this.form.value;

    const nuevas: VarianteExtra[] = seleccionadas.map(t => {
      const existing = this.variantesExtras.find(
        e => e.source === 'numerica' && e.talla === String(t.num)
      );
      if (existing) {
        existing.form.patchValue({ stock: t.stock });
        return existing;
      }
      return {
        talla: String(t.num),
        source: 'numerica' as const,
        form: this.buildExtraForm(mainVal, t.stock)
      };
    });

    this.variantesExtras = [
      ...nuevas,
      ...this.variantesExtras.filter(e => e.source === 'letra')
    ];
    this.modalNumVisible = false;
  }

  onStockNumChange(t: TallaNumeral, e: Event): void {
    t.stock = +(e.target as HTMLInputElement).value || 0;
  }

  // ── Modal tallas por letras ────────────────────────────────────────

  abrirModalLetra(): void {
    if (this.tallasLetras.length === 0) this.initLetras();
    this.modalLetraVisible = true;
  }

  cerrarModalLetra(): void { this.modalLetraVisible = false; }

  private initLetras(): void {
    this.letraNextId = 0;
    this.tallasLetras = this.LETRAS_BASE.map(t => ({
      id: this.letraNextId++,
      talla: t,
      checked: false,
      stock: 0
    }));
  }

  toggleLetra(item: TallaLetra): void {
    item.checked = !item.checked;
    if (item.checked) {
      // Insertar chip nuevo sin marcar justo después de todos los chips de esta misma talla
      const lastIdx = this.tallasLetras.reduce((acc, t, i) =>
        t.talla === item.talla ? i : acc, -1);
      this.tallasLetras.splice(lastIdx + 1, 0, {
        id: this.letraNextId++,
        talla: item.talla,
        checked: false,
        stock: 0
      });
    } else {
      // Al desmarcar: eliminar el último chip sin marcar duplicado de esta talla
      const sinMarcar = this.tallasLetras
        .map((t, i) => ({ t, i }))
        .filter(x => x.t.talla === item.talla && !x.t.checked);
      if (sinMarcar.length > 1) {
        this.tallasLetras.splice(sinMarcar[sinMarcar.length - 1].i, 1);
      }
    }
  }

  confirmarModalLetra(): void {
    const seleccionadas = this.tallasLetras.filter(t => t.checked);
    const mainVal = this.form.value;

    const nuevas: VarianteExtra[] = seleccionadas.map(t => ({
      talla: t.talla,
      source: 'letra' as const,
      form: this.buildExtraForm(mainVal, t.stock)
    }));

    this.variantesExtras = [
      ...this.variantesExtras.filter(e => e.source === 'numerica'),
      ...nuevas
    ];
    this.modalLetraVisible = false;
  }

  onStockLetraChange(t: TallaLetra, e: Event): void {
    t.stock = +(e.target as HTMLInputElement).value || 0;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private buildExtraForm(mainVal: any, stock: number): FormGroup {
    return this.fb.group({
      color:        [mainVal.color         || ''],
      presentacion: [mainVal.presentacion  || ''],
      marca:        [mainVal.marca         || ''],
      contenidoNeto:[mainVal.contenidoNeto || ''],
      descripcion:  [mainVal.descripcion   || ''],
      stock:        [stock],
    });
  }

  // Etiqueta para extras con la misma talla: "S", "S #2", "S #3"...
  extraLabel(extra: VarianteExtra, idx: number): string {
    const previos = this.variantesExtras.slice(0, idx).filter(e => e.talla === extra.talla).length;
    return previos > 0 ? `${extra.talla} #${previos + 1}` : extra.talla;
  }

  // Propaga color, presentación, marca, contenido y descripción del form principal a todos
  propagarCampos(): void {
    const { color, presentacion, marca, contenidoNeto, descripcion } = this.form.value;
    this.variantesExtras.forEach(e =>
      e.form.patchValue({ color, presentacion, marca, contenidoNeto, descripcion })
    );
  }

  eliminarExtra(i: number): void {
    const extra = this.variantesExtras[i];
    if (extra.source === 'numerica') {
      const chip = this.tallasNum.find(t => String(t.num) === extra.talla);
      if (chip) chip.checked = false;
    } else {
      const idx = this.tallasLetras.findIndex(t => t.talla === extra.talla && t.checked);
      if (idx !== -1) this.tallasLetras.splice(idx, 1);
    }
    this.variantesExtras.splice(i, 1);
  }

  // ── Imágenes ──────────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('vf-drop--over');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('vf-drop--over');
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('vf-drop--over');
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    Array.from(files).forEach(f => this.procesarImagen(f));
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    Array.from(files).forEach(f => this.procesarImagen(f));
    input.value = '';
  }

  private procesarImagen(file: File): void {
    if (!this.TIPOS_PERMITIDOS.includes(file.type)) {
      Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: `"${file.name}" no es JPG, PNG ni GIF.`, timer: 2500, showConfirmButton: false });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const comprimido = this.comprimirImagen(img);
        this.imagenesCargadas.push({
          base64: comprimido.split(',')[1],
          extension: 'image/jpeg',
          nombreImagen: file.name
        });
        if (this.imagenesCargadas.length === 1) this.mostrarEnCanvas(comprimido);
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  }

  // Redimensiona al máximo de DIMENSION_MAX y reencoda como JPEG para evitar
  // 413 Request Entity Too Large al mandar varias fotos de cámara (3-8 MB c/u) en base64
  private comprimirImagen(img: HTMLImageElement): string {
    const escala = Math.min(1, this.DIMENSION_MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', this.CALIDAD_JPEG);
  }

  // ── Cámara ────────────────────────────────────────────────────────

  async abrirCamara(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.mostrandoCamara = true;
      await new Promise(r => setTimeout(r, 100));
      this.videoCamaraRef.nativeElement.srcObject = this.mediaStream;
    } catch {
      Swal.fire({ icon: 'error', title: 'Sin acceso a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.', timer: 2500, showConfirmButton: false });
    }
  }

  capturarFoto(): void {
    const video  = this.videoCamaraRef?.nativeElement;
    const canvas = this.canvasCamaraRef?.nativeElement;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.cerrarCamara();
      this.procesarImagen(file);
    }, 'image/jpeg', 0.92);
  }

  cerrarCamara(): void {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    this.mostrandoCamara = false;
  }

  ngOnDestroy(): void { this.cerrarCamara(); }

  private mostrarEnCanvas(src: string): void {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
  }

  eliminarImagen(i: number): void {
    this.imagenesCargadas.splice(i, 1);
    if (this.imagenesCargadas.length === 0 && this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }

  // ── Guardar ────────────────────────────────────────────────────────

  /**
   * ¿El formulario base describe un artículo de verdad?
   *
   * **El bug que arregla** (reportado 2026-09-22): "si en tallas solo agrego 2 aparece que voy a
   * guardar 3 aunque esté vacío lo que llené". El formulario de arriba y la sección de tallas
   * son independientes: si se usa solo la de tallas, el de arriba queda vacío pero igual se
   * mandaba como un artículo más.
   *
   * La regla es **deliberadamente conservadora** — es la misma que el back aplica en
   * `ArticuloDeAlta.describeAlgo()`. Solo se descarta si no tiene NINGÚN dato propio, NI stock,
   * NI imágenes. Así el caso legítimo de "solo quiero dar de alta uno" sigue funcionando: con
   * llenar cualquier cosa, entra.
   */
  private get baseDescribeAlgo(): boolean {
    const v = this.form.value ?? {};
    const conTexto = (x: any) => typeof x === 'string' && x.trim().length > 0;

    return conTexto(v.talla)
        || conTexto(v.color)
        || conTexto(v.marca)
        || conTexto(v.descripcion)
        || conTexto(v.presentacion)
        || conTexto(v.contenidoNeto)
        || (Number(v.stock) || 0) > 0
        || this.imagenesCargadas.length > 0;
  }

  /**
   * Cuántos artículos se van a guardar de verdad. Es lo que se muestra en pantalla, así que
   * tiene que coincidir con lo que se manda — era justo lo que no pasaba.
   */
  get totalAGuardar(): number {
    return this.variantesExtras.length + (this.baseDescribeAlgo ? 1 : 0);
  }

  guardar(): void {
    if (!this.productoSeleccionado) {
      Swal.fire({ icon: 'warning', title: 'Selecciona un producto', timer: 1800, showConfirmButton: false });
      return;
    }

    const incluirBase = this.baseDescribeAlgo;

    if (!incluirBase && this.variantesExtras.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay nada que guardar',
        text: 'Llená al menos la talla, el color u otro dato, o ponéle stock.'
      });
      return;
    }

    this.guardando = true;

    const productoId = this.productoSeleccionado.idProducto;

    const palabraClaveId = this.palabraClaveSeleccionada?.id ?? null;

    // Una sola petición con todas las variantes como lista.
    // ⚠️ El formulario base solo entra si describe algo — si no, se estaría guardando un
    // artículo vacío que nadie pidió. `palabraClaveId` va en TODAS: la categoría elegida
    // arriba aplica a todo el lote, no solo al primero.
    const payloads: IVarianteRequest[] = [
      // Formulario principal — lleva las imágenes y la palabra clave
      ...(incluirBase
        ? [{ productoId, ...this.form.value, palabraClaveId, listImagenes: this.imagenesCargadas }]
        : []),
      // Variantes extra — misma palabra clave, sin imágenes para no duplicar el base64
      ...this.variantesExtras.map(e => ({
        productoId,
        ...e.form.value,
        talla: e.talla,
        palabraClaveId,
        listImagenes: []
      }))
    ];

    // Si el base quedó fuera, las imágenes viajan con el primer artículo de tallas: si no, se
    // perderían sin aviso — el usuario las cargó y esperaría verlas.
    if (!incluirBase && this.imagenesCargadas.length > 0 && payloads.length > 0) {
      payloads[0] = { ...payloads[0], listImagenes: this.imagenesCargadas };
    }

    this.varianteService.save(payloads).subscribe({
      next: () => this.onExito(),
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.mensaje ?? 'No se pudo guardar la variante.';
        Swal.fire({ icon: 'error', title: 'Error al guardar', text: msg, confirmButtonColor: '#dc2626' });
      }
    });
  }

  // Nuevo — recibe la selección del autocomplete de palabra clave
  onPalabraClaveSeleccionada(p: IPalabraClave | null): void {
    this.palabraClaveSeleccionada = p;
  }

  private onExito(): void {
    this.varianteService.invalidarCache();
    this.guardando = false;
    // Antes era `variantesExtras.length + 1`, que contaba el formulario base aunque estuviera
    // vacío: con 2 tallas decía "3 variantes creadas".
    const total = this.totalAGuardar;
    Swal.fire({
      icon: 'success',
      title: total > 1 ? `¡${total} variantes creadas!` : '¡Variante creada!',
      timer: 1600,
      showConfirmButton: false
    });
    this.resetForm();
  }

  private resetForm(): void {
    this.form.reset();
    this.productoSeleccionado  = null;
    this.terminoProducto       = '';
    this.imagenesCargadas      = [];
    this.variantesExtras       = [];
    this.palabraClaveSeleccionada = null; // Nuevo — limpia la selección de palabra clave
    this.tallasNum.forEach(t => { t.checked = false; t.stock = 0; });
    this.tallasLetras = [];
    if (this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }
}
