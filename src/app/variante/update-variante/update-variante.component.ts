import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IVariante, IVarianteRequest } from '../models/variante.model';
import { VarianteService } from '../service/variante.service';

@Component({
  selector: 'app-update-variante',
  templateUrl: './update-variante.component.html',
  styleUrls: ['./update-variante.component.scss']
})
export class UpdateVarianteComponent implements OnInit {

  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  guardando = false;
  variante: IVariante | null = null;

  // Búsqueda de producto
  terminoProducto = '';
  productos: IProductoDTO[] = [];
  productoSeleccionado: IProductoDTO | null = null;
  private busquedaSubject = new Subject<string>();

  // Imágenes
  imagenesCargadas: IImagenDto[] = [];

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

    if (this.variante.producto) {
      this.productoSeleccionado = {
        idProducto:  this.variante.producto.id,
        nombre:      this.variante.producto.nombre ?? '',
        precioVenta: this.variante.producto.precioVenta ?? 0,
        stock:       0,
      } as IProductoDTO;
      this.terminoProducto = this.variante.producto.nombre ?? '';
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
    const extension = file.name.split('.').pop() ?? '';
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagenesCargadas.push({ base64: base64.split(',')[1], extension, nombreImagen: file.name });
      if (this.imagenesCargadas.length === 1) this.mostrarEnCanvas(base64);
    };
    reader.readAsDataURL(file);
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
    if (!this.imagenesCargadas.length && this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
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

  // ── Actualizar ─────────────────────────────────────────────────────

  actualizar(): void {
    if (!this.productoSeleccionado || !this.variante?.id) return;
    this.guardando = true;

    const payload: IVarianteRequest = {
      id:         this.variante.id,
      productoId: this.productoSeleccionado.idProducto,
      ...this.form.value,
      ...(this.imagenesCargadas.length ? { listImagenes: this.imagenesCargadas } : {})
    };

    this.varianteService.update(this.variante.id, payload).subscribe({
      next: () => {
        this.varianteService.invalidarCache();
        this.varianteService.clearVarianteUpdate();
        this.guardando = false;
        Swal.fire({ icon: 'success', title: '¡Variante actualizada!', timer: 1600, showConfirmButton: false })
          .then(() => this.router.navigate(['/variantes/buscar']));
      },
      error: () => { this.guardando = false; }
    });
  }
}
