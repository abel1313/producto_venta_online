import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IVariante, IVarianteImagenDto, IVarianteRequest } from '../models/variante.model';
import { VarianteService } from '../service/variante.service';
// Nuevo — palabra clave para categorizar la variante
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';

@Component({
  selector: 'app-update-variante',
  templateUrl: './update-variante.component.html',
  styleUrls: ['./update-variante.component.scss']
})
export class UpdateVarianteComponent implements OnInit, OnDestroy {

  @ViewChild('canvasRef')    canvasRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput')    fileInputRef!:    ElementRef<HTMLInputElement>;
  @ViewChild('videoCamara')  videoCamaraRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCamara') canvasCamaraRef!: ElementRef<HTMLCanvasElement>;

  form!: FormGroup;
  guardando = false;
  variante: IVariante | null = null;

  // Búsqueda de producto
  terminoProducto = '';
  productos: IProductoDTO[] = [];
  productoSeleccionado: IProductoDTO | null = null;
  private busquedaSubject = new Subject<string>();

  // Imágenes nuevas a subir
  imagenesCargadas: IImagenDto[] = [];
  mostrandoCamara = false;
  private mediaStream: MediaStream | null = null;
  private readonly TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif'];

  // Imágenes existentes de la variante
  imagenesExistentes: IVarianteImagenDto[] = [];
  cargandoImagenesExistentes = false;
  eliminandoExistente = new Set<string>();
  cambiandoPrincipal = new Set<string>();
  imagenPrincipalId: string | null = null;

  // Nuevo — palabra clave seleccionada vía autocomplete
  palabraClaveSeleccionada: IPalabraClave | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly varianteService: VarianteService,
    private readonly productoService: ProductoService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.variante = this.varianteService.varianteParaEditar;

    if (!this.variante) {
      this.router.navigate(['/variantes/buscar']);
      return;
    }

    this.form = this.fb.group({
      talla:         [this.variante.talla         ?? ''],
      color:         [this.variante.color         ?? ''],
      presentacion:  [this.variante.presentacion  ?? ''],
      stock:         [this.variante.stock         ?? null],
      descripcion:   [this.variante.descripcion   ?? ''],
      marca:         [this.variante.marca         ?? ''],
      contenidoNeto: [this.variante.contenidoNeto ?? ''],
    });

    // Precargar palabra clave si la variante ya tenía una asignada
    if (this.variante.palabraClave) {
      this.palabraClaveSeleccionada = this.variante.palabraClave;
    }

    if (this.variante.producto) {
      this.productoSeleccionado = {
        idProducto:  this.variante.producto.id,
        nombre:      this.variante.producto.nombre ?? '',
        precioVenta: this.variante.producto.precioVenta ?? 0,
        stock:       0,
      } as IProductoDTO;
      this.terminoProducto = this.variante.producto.nombre ?? '';
    }

    if (this.variante.id) {
      this.cargarImagenesExistentes(this.variante.id);
    }

    this.busquedaSubject.pipe(
      debounceTime(350),
      switchMap((t: string) => t.length < 3 ? (this.productos = [], EMPTY)
                                            : this.productoService.getDataNombreCodigoBarra(1, 10, t))
    ).subscribe({ next: res => { this.productos = res.t ?? []; } });
  }

  // ── Producto ───────────────────────────────────────────────────────

  onBuscarProducto(event: KeyboardEvent): void {
    this.busquedaSubject.next((event.target as HTMLInputElement).value);
  }

  seleccionarProducto(p: IProductoDTO): void {
    this.productoSeleccionado = p;
    this.terminoProducto = p.nombre;
    this.productos = [];
  }

  limpiarProducto(): void {
    this.productoSeleccionado = null;
    this.terminoProducto = '';
    this.productos = [];
  }

  // ── Imágenes ───────────────────────────────────────────────────────

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
    this.imagenesCargadas = [];
    Array.from(files).forEach(f => this.procesarImagen(f));
  }

  onFileSelected(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    if (!files?.length) return;
    this.imagenesCargadas = [];
    Array.from(files).forEach(f => this.procesarImagen(f));
  }

  private procesarImagen(file: File): void {
    if (!this.TIPOS_PERMITIDOS.includes(file.type)) {
      Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: `"${file.name}" no es JPG, PNG ni GIF.`, timer: 2500, showConfirmButton: false });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagenesCargadas.push({ base64: base64.split(',')[1], extension: file.type, nombreImagen: file.name });
      if (this.imagenesCargadas.length === 1) this.mostrarEnCanvas(base64);
    };
    reader.readAsDataURL(file);
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
    if (!this.imagenesCargadas.length && this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }

  // ── Imágenes existentes ───────────────────────────────────────────

  private cargarImagenesExistentes(varianteId: number): void {
    this.cargandoImagenesExistentes = true;
    this.varianteService.getImagenesPaginado(varianteId, 1, 50).subscribe({
      next: res => {
        this.imagenesExistentes = res.t ?? [];
        const principal = this.imagenesExistentes.find(i => i.principal);
        if (principal?.id) this.imagenPrincipalId = principal.id;
        this.cargandoImagenesExistentes = false;
      },
      error: () => { this.cargandoImagenesExistentes = false; }
    });
  }

  eliminarImagenExistente(img: IVarianteImagenDto): void {
    if (!img.id || this.eliminandoExistente.has(img.id)) return;

    Swal.fire({
      title: '¿Eliminar imagen?',
      text: img.nombreImagen,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#1e1b4b',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed || !img.id || !this.variante?.id) return;
      this.eliminandoExistente.add(img.id);

      this.varianteService.eliminarImagenes(this.variante!.id!, [img.id]).subscribe({
        next: () => {
          this.imagenesExistentes = this.imagenesExistentes.filter(i => i.id !== img.id);
          this.eliminandoExistente.delete(img.id!);
        },
        error: () => {
          this.eliminandoExistente.delete(img.id!);
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        }
      });
    });
  }

  setPrincipalVariante(img: IVarianteImagenDto): void {
    if (!img.id || img.principal) return;
    this.imagenesExistentes.forEach(i => i.principal = false);
    img.principal = true;
    this.imagenPrincipalId = img.id;
  }

  // ── Ajuste de stock ────────────────────────────────────────────────

  cantidadAjuste = 1;

  get stockActual(): number {
    return this.form?.get('stock')?.value ?? 0;
  }

  ajustarStock(tipo: 'agregar' | 'quitar'): void {
    const cantidad = Math.max(1, Math.abs(this.cantidadAjuste ?? 1));
    const nuevo = tipo === 'agregar'
      ? this.stockActual + cantidad
      : Math.max(0, this.stockActual - cantidad);
    this.form.patchValue({ stock: nuevo });
  }

  // Nuevo — recibe la selección del autocomplete de palabra clave
  onPalabraClaveSeleccionada(p: IPalabraClave | null): void {
    this.palabraClaveSeleccionada = p;
  }

  // ── Actualizar ─────────────────────────────────────────────────────

  actualizar(): void {
    if (!this.productoSeleccionado || !this.variante?.id) return;
    this.guardando = true;

    const payload: IVarianteRequest = {
      id:                this.variante.id,
      productoId:        this.productoSeleccionado.idProducto,
      ...this.form.value,
      palabraClaveId:    this.palabraClaveSeleccionada?.id ?? null,
      imagenPrincipalId: this.imagenPrincipalId,
      ...(this.imagenesCargadas.length ? { listImagenes: this.imagenesCargadas } : {})
    };

    this.varianteService.update(this.variante.id, payload).subscribe({
      next: (res) => {
        const updated = res?.data?.[0];
        if (updated) {
          const cache = this.varianteService.variantesCache;
          const idx = cache.findIndex(v => v.id === updated.id);
          if (idx !== -1) {
            cache[idx] = {
              ...cache[idx],
              talla:         updated.talla         ?? cache[idx].talla,
              color:         updated.color         ?? cache[idx].color,
              marca:         updated.marca         ?? cache[idx].marca,
              presentacion:  updated.presentacion  ?? cache[idx].presentacion,
              stock:         updated.stock         ?? cache[idx].stock,
              descripcion:   updated.descripcion   ?? cache[idx].descripcion,
              contenidoNeto: updated.contenidoNeto ?? cache[idx].contenidoNeto,
            };
          }
        }
        this.varianteService.invalidarCache();
        this.varianteService.clearVarianteUpdate();
        this.guardando = false;
        Swal.fire({ icon: 'success', title: '¡Variante actualizada!', timer: 1600, showConfirmButton: false })
          .then(() => this.router.navigate(['/variantes/buscar']));
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.mensaje ?? 'No se pudo actualizar la variante.';
        Swal.fire({ icon: 'error', title: 'Error al actualizar', text: msg, confirmButtonColor: '#dc2626' });
      }
    });
  }
}
