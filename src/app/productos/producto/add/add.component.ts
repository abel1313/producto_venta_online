import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../../../shared/barcode-scanner.util';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { IImagenDto } from '../models';
import { IProducto } from '../models/producto.model';
import { IProductoDTORec } from '../models/producto.dto.model';
import { ProductoService } from '../../service/producto.service';
// Nuevo — palabra clave para categorizar el producto en búsquedas
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('canvas',       { static: false }) canvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput',    { static: false }) fileInputRef!:   ElementRef<HTMLInputElement>;
  @ViewChild('videoCamara',  { static: false }) videoCamaraRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCamara', { static: false }) canvasCamaraRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('videoScanner', { static: false }) videoScannerRef!: ElementRef<HTMLVideoElement>;

  @Input() nombreCard    = 'Agregar Producto';
  @Input() productoUpdate: IProductoDTORec | null = null;

  formProductos!: FormGroup;
  imagenesCargadas: IImagenDto[] = [];
  guardando = false;
  mostrandoCamara = false;
  private mediaStream: MediaStream | null = null;
  private formReady = false;

  // Escáner de código de barras (mismo patrón que variante/buscar/buscar.component.ts)
  escaneandoCodigo = false;
  private controlesEscanerCodigo: IScannerControls | null = null;
  // Nuevo — palabra clave seleccionada vía autocomplete
  palabraClaveSeleccionada: IPalabraClave | null = null;

  // Código de barras que tenía el producto AL ABRIR la pantalla de editar.
  // Desde el fix del back (2026-07-21), save/update matchean por `id` cuando
  // se manda (ver ejecutarGuardar) — cambiar el código ya no duplica un
  // producto normal. Sigue usándose para detectar borradores de carga
  // rápida (código autogenerado BRD-...), que NUNCA deben pasar por esta
  // pantalla — ver esBorradorCargaRapida().
  private codigoBarrasOriginal: string | null = null;
  // true mientras cargarProductoUpdate() está corriendo su patchValue —
  // evita que el listener de sinCodigoBarra regenere un código nuevo solo
  // porque el producto cargado no traía código (ver initCodigoBarra()).
  private cargandoDesdeUpdate = false;

  get esActualizar(): boolean { return this.nombreCard === 'Actualizar Producto'; }

  constructor(
    private readonly fb:      FormBuilder,
    private readonly service: ProductoService,
    public  readonly authService: AuthService,
    private readonly router:  Router
  ) {}

  // ── Ciclo de vida ──────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildForm();
    this.initPrecioVenta();
    this.initCodigoBarra();
    this.initValidacionEliminarStock();
    this.formReady = true;
    if (this.esActualizar) {
      // El stock real en edición solo se mueve con "Actualizar stock" / "Eliminar stock" (que
      // suman/restan contra el stock real de la BD, con validación de no quedar negativo -- ver
      // guardarProducto() en el back). El campo "Stock" a secas queda bloqueado para que no se
      // pueda pisar el valor a mano por error (pedido 2026-08-28).
      this.formProductos.get('stock')?.disable();
    }
    if (this.esActualizar && this.productoUpdate) {
      this.cargarProductoUpdate();
    }
  }

  // "Eliminar stock" no puede superar el stock actual -- si el admin lo intenta, se marca
  // inválido en vivo (además de la validación del back, que es la que realmente protege el dato).
  private initValidacionEliminarStock(): void {
    this.formProductos.get('eliminarStock')!.valueChanges.subscribe((valor: number) => {
      const ctrl = this.formProductos.get('eliminarStock')!;
      const stockActual = +(this.formProductos.get('stock')?.value ?? 0);
      if (+valor > stockActual) {
        ctrl.setErrors({ excedeStock: true });
      } else if (ctrl.hasError('excedeStock')) {
        ctrl.setErrors(null);
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoUpdate'] && this.productoUpdate && this.esActualizar && this.formReady) {
      this.cargarProductoUpdate();
    }
  }

  // ── Construcción del form ──────────────────────────────────────────

  private buildForm(): void {
    this.formProductos = this.fb.group({
      nombre:         ['', [Validators.required, Validators.maxLength(100)]],
      precioCosto:    ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      precioVenta:    ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      precioRebaja:   ['',  Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      stock:          ['', [Validators.required, Validators.min(0)]],
      descripcion:    ['',  Validators.required],
      marca:          ['',  Validators.required],
      color:          [''],
      piezas:         [''],
      contenido:      [''],
      actualizarStock:['0'],
      eliminarStock:  ['0'],
      codigoBarras:   ['', [Validators.required, Validators.maxLength(100)]],
      sinCodigoBarra: [false],
    });
  }

  // Cuando cambia precioVenta, copiar a precioRebaja automáticamente
  private initPrecioVenta(): void {
    this.formProductos.get('precioVenta')!.valueChanges.subscribe(valor => {
      this.formProductos.get('precioRebaja')!.setValue(valor, { emitEvent: false });
    });
  }

  // Lógica limpia del checkbox de código de barras
  private initCodigoBarra(): void {
    this.formProductos.get('sinCodigoBarra')!.valueChanges.subscribe((sinCodigo: boolean) => {
      const ctrl = this.formProductos.get('codigoBarras')!;
      if (sinCodigo) {
        // patchValue() en cargarProductoUpdate() dispara este valueChanges
        // aunque el admin no haya tocado nada — si el producto que se está
        // editando llegó sin código, NO hay que inventarle uno nuevo aquí:
        // el backend matchea por código exacto, y un código recién generado
        // nunca existe en BD → crearía un producto duplicado al guardar.
        // Solo se genera cuando el admin activa el toggle a propósito.
        if (!this.cargandoDesdeUpdate) {
          ctrl.setValue(this.generarCodigoBarras());
        }
        ctrl.clearValidators();
      } else {
        // Limpiar para que el usuario ingrese el suyo
        //ctrl.setValue('');
        ctrl.setValidators([Validators.required, Validators.maxLength(100)]);
      }
      ctrl.updateValueAndValidity();
    });
  }

  // Formato: MMDDYYYY + 5 dígitos aleatorios = 13 chars  (ej: 0429202648731)
  private generarCodigoBarras(): string {
    const now  = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `${mm}${dd}${yyyy}${rand}`;
  }

  // ── Carga de datos en modo actualizar ──────────────────────────────

  // Nuevo — recibe la selección del autocomplete de palabra clave
  onPalabraClaveSeleccionada(p: IPalabraClave | null): void {
    this.palabraClaveSeleccionada = p;
  }

  // El tipo declara `codigoBarras: ICodigoBarra` (objeto { id, codigoBarras }),
  // pero el item que realmente llega desde la grilla (IProductoDTO) lo trae
  // como string plano — el cast `as IProductoDTORec` en UpdateComponent no
  // convierte el valor en tiempo de ejecución. Se soportan ambas formas para
  // no quedar con "[object Object]" si algún día el DTO cambia de forma.
  private extraerCodigo(cb: unknown): string {
    if (!cb) return '';
    if (typeof cb === 'string') return cb;
    if (typeof cb === 'object' && 'codigoBarras' in (cb as any)) {
      return (cb as any).codigoBarras ?? '';
    }
    return '';
  }

  private cargarProductoUpdate(): void {
    const p = this.productoUpdate!;
    const codigo = this.extraerCodigo(p.codigoBarras);
    const tieneCodigo = !!codigo;
    this.codigoBarrasOriginal = codigo || null;
    // Precargar palabra clave si el producto ya tenía una asignada
    if (p.palabraClave) this.palabraClaveSeleccionada = p.palabraClave;

    this.cargandoDesdeUpdate = true;
    this.formProductos.patchValue({
      nombre:        p.nombre,
      precioCosto:   p.precioVenta,
      piezas:        p.piezas,
      color:         p.color,
      precioVenta:   p.precioVenta,
      precioRebaja:  p.precioRebaja,
      descripcion:   p.descripcion,
      stock:         p.stock,
      marca:         p.marca,
      contenido:     p.contenido,
      codigoBarras:  codigo,
      sinCodigoBarra:!tieneCodigo
    });
    this.cargandoDesdeUpdate = false;
  }

  // ── Guardar ────────────────────────────────────────────────────────

  guardar(): void {
    if (this.formProductos.invalid) {
      this.formProductos.markAllAsTouched();
      return;
    }
    const raw = this.formProductos.getRawValue();

    // Borrador de carga rápida (código autogenerado BRD-...): aunque el back
    // ya matchea por id y no duplica, save/update NO resetean
    // `codigoBarrasGenerado` ni validan el estado de la imagen — queda en un
    // estado inconsistente (bloquea "habilitar", ensucia el filtro admin
    // codigoGenerado). Para estos SIEMPRE hay que usar Carga rápida de
    // imágenes → PUT /completar. Se bloquea por completo, no se ofrece
    // continuar (ver CAMBIOS_FRONT.md, sección "Aclaración importante...").
    if (this.esActualizar && this.esBorradorCargaRapida) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Este producto es un borrador de Carga rápida de imágenes',
        html: `Todavía tiene el código autogenerado <b>${this.codigoBarrasOriginal}</b>.
               Esta pantalla no es la indicada para completarlo — usa
               <b>📸 Carga rápida de imágenes</b> y el botón "✏️ Completar datos" de ese
               borrador, para que el código real quede asignado correctamente.`,
        confirmButtonText: 'Ir a Carga rápida de imágenes',
        showCancelButton: true,
        cancelButtonText: 'Quedarme aquí'
      }).then(res => {
        if (res.isConfirmed) this.router.navigate(['/carga-imagenes']);
      });
      return;
    }

    this.ejecutarGuardar(raw);
  }

  // true si el producto que se está editando nació de Carga rápida de
  // imágenes y todavía no tiene su código de barras real asignado.
  private get esBorradorCargaRapida(): boolean {
    return !!this.codigoBarrasOriginal?.toUpperCase().startsWith('BRD-');
  }

  private ejecutarGuardar(raw: any): void {
    const productoSave: IProducto = {
      nombre:         raw.nombre,
      precioCosto:    +raw.precioCosto,
      piezas:         +raw.piezas   || 0,
      color:           raw.color    || '',
      precioVenta:    +raw.precioVenta,
      precioRebaja:   +raw.precioRebaja || +raw.precioVenta,
      descripcion:     raw.descripcion  || '',
      stock:          +raw.stock,
      marca:           raw.marca,
      contenido:       raw.contenido   || '',
      actualizarStock:+raw.actualizarStock || 0,
      eliminarStock:  +raw.eliminarStock   || 0,
      codigoBarras:   { codigoBarras: raw.codigoBarras, id: 0 },
      listImagenes:      this.imagenesCargadas,
      palabraClaveId:    this.palabraClaveSeleccionada?.id ?? null,
      imagenPrincipalId: this.productoUpdate?.imagenPrincipalId ?? null,
      // Requerido desde el fix del back (2026-07-21): sin id, save/update
      // vuelve a matchear por código de barras y puede duplicar el producto
      // si el código cambió. En modo "Agregar" no se manda (undefined) —
      // ahí sí se busca por código porque el producto todavía no tiene id.
      ...(this.esActualizar ? { id: this.productoUpdate?.idProducto } : {})
    };

    this.guardando = true;
    this.service.saveProducto(productoSave).subscribe({
      next: () => {
        this.guardando = false;
        this.resetForm();
        this.service.invalidarProdCache();
        Swal.fire({
          title: this.esActualizar ? '¡Producto actualizado!' : '¡Producto guardado!',
          icon: 'success',
          timer: 1600,
          showConfirmButton: false
        }).then(() => {
          if (this.esActualizar) this.router.navigate(['/productos/buscar']);
        });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar el producto.', timer: 2000, showConfirmButton: false });
      }
    });
  }

  // alias usado en template del modo actualizar
  update(): void { this.guardar(); }

  private resetForm(): void {
    this.formProductos.reset({ sinCodigoBarra: false, actualizarStock: 0, eliminarStock: 0 });
    this.imagenesCargadas = [];
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Helpers de validación para el template ─────────────────────────

  ctrl(name: string) { return this.formProductos.get(name); }
  isInvalid(name: string): boolean {
    const c = this.ctrl(name);
    return !!(c?.invalid && c?.touched);
  }

  get sinCodigoActivo(): boolean {
    return !!this.formProductos.get('sinCodigoBarra')?.value;
  }

  // ── Imágenes ──────────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('pf-drop--over');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('pf-drop--over');
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('pf-drop--over');
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    this.imagenesCargadas = [];
    Array.from(files).forEach(f => this.procesarImagen(f));
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.imagenesCargadas = [];
    Array.from(input.files).forEach(f => this.procesarImagen(f));
    input.value = '';
  }

  private readonly TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif'];
  private readonly DIMENSION_MAX = 1280;
  private readonly CALIDAD_JPEG = 0.8;

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
          base64:       comprimido.split(',')[1],
          extension:    'image/jpeg',
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
    if (this.imagenesCargadas.length === 0) {
      const canvas = this.canvasRef?.nativeElement;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
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

  // ── Escáner de código de barras ──────────────────────────────────────
  // Reusa el mismo patrón que variante/buscar/buscar.component.ts →
  // iniciarEscaner() (BrowserMultiFormatReader de @zxing/browser).

  async iniciarEscanerCodigo(): Promise<void> {
    this.escaneandoCodigo = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      this.controlesEscanerCodigo = await iniciarEscanerConAutofoco(
        this.videoScannerRef.nativeElement,
        (result, _err, controls) => {
          if (result) {
            // El código escaneado siempre es el real: se apaga "generar
            // automático" (si estaba activo) para que el valor no se
            // sobrescriba y el input quede editable con lo escaneado.
            this.formProductos.patchValue({
              sinCodigoBarra: false,
              codigoBarras: result.getText()
            });
            controls.stop();
            this.escaneandoCodigo = false;
          }
        }
      );
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo acceder a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.', timer: 2500, showConfirmButton: false });
      this.escaneandoCodigo = false;
    }
  }

  detenerEscanerCodigo(): void {
    this.controlesEscanerCodigo?.stop();
    this.controlesEscanerCodigo = null;
    this.escaneandoCodigo = false;
  }

  ngOnDestroy(): void {
    this.cerrarCamara();
    this.detenerEscanerCodigo();
  }
}
