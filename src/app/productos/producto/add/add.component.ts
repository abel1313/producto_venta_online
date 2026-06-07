import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
export class AddComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('canvas',       { static: false }) canvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput',    { static: false }) fileInputRef!:   ElementRef<HTMLInputElement>;
  @ViewChild('videoCamara',  { static: false }) videoCamaraRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCamara', { static: false }) canvasCamaraRef!: ElementRef<HTMLCanvasElement>;

  @Input() nombreCard    = 'Agregar Producto';
  @Input() productoUpdate: IProductoDTORec | null = null;

  formProductos!: FormGroup;
  imagenesCargadas: IImagenDto[] = [];
  guardando = false;
  mostrandoCamara = false;
  private mediaStream: MediaStream | null = null;
  // Nuevo — palabra clave seleccionada vía autocomplete
  palabraClaveSeleccionada: IPalabraClave | null = null;

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
  }

  ngAfterViewInit(): void {
    if (this.esActualizar && this.productoUpdate) {
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
        // Generar código automático basado en fecha
        ctrl.setValue(this.generarCodigoBarras());
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

  private cargarProductoUpdate(): void {
    const p = this.productoUpdate!;
    const tieneCodigo = !!p.codigoBarras;
    // Precargar palabra clave si el producto ya tenía una asignada
    if (p.palabraClave) this.palabraClaveSeleccionada = p.palabraClave;
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
      codigoBarras:  p.codigoBarras ?? '',
      sinCodigoBarra:!tieneCodigo
    });
  }

  // ── Guardar ────────────────────────────────────────────────────────

  guardar(): void {
    if (this.formProductos.invalid) {
      this.formProductos.markAllAsTouched();
      return;
    }
    const raw = this.formProductos.getRawValue();

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
      imagenPrincipalId: this.productoUpdate?.imagenPrincipalId ?? null
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
      error: () => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', timer: 2000, showConfirmButton: false });
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

  ngOnDestroy(): void {
    this.cerrarCamara();
  }
}
