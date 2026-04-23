import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { IVariante } from '../models/variante.model';
import { VarianteService } from '../service/variante.service';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.component.html',
  styleUrls: ['./agregar.component.scss']
})
export class AgregarComponent implements OnInit {

  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  guardando = false;

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

  // ── Imágenes (igual que add producto) ─────────────────────────────

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
      this.imagenesCargadas.push({
        base64: base64.split(',')[1],
        extension,
        nombreImagen: file.name
      });
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
    if (this.imagenesCargadas.length === 0 && this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }

  // ── Guardar ────────────────────────────────────────────────────────

  guardar(): void {
    if (!this.productoSeleccionado) {
      Swal.fire({ icon: 'warning', title: 'Selecciona un producto', timer: 1800, showConfirmButton: false });
      return;
    }
    this.guardando = true;

    const payload: IVariante = {
      ...this.form.value,
       productoId: this.productoSeleccionado.idProducto ,
      listImagenes: this.imagenesCargadas
    };

    this.varianteService.save(payload).subscribe({
      next: () => {
        this.varianteService.invalidarCache();
        this.guardando = false;
        Swal.fire({ icon: 'success', title: '¡Variante creada!', timer: 1600, showConfirmButton: false });
        this.resetForm();
      },
      error: () => { this.guardando = false; }
    });
  }

  private resetForm(): void {
    this.form.reset();
    this.productoSeleccionado = null;
    this.terminoProducto = '';
    this.imagenesCargadas = [];
    if (this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }
}
