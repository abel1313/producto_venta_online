import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { IVarianteRequest } from '../models/variante.model';
import { VarianteService } from '../service/variante.service';

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

  // Imágenes (compartidas con todas las variantes)
  imagenesCargadas: IImagenDto[] = [];

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
        : this.productoService.getDataNombreCodigoBarra(1, 10, t))
    ).subscribe({ next: res => { this.productos = res.t ?? []; } });
  }

  // ── Búsqueda de producto ───────────────────────────────────────────

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
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.imagenesCargadas.push({
        base64: base64.split(',')[1],
        extension: file.type,
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

    const productoId = this.productoSeleccionado.idProducto;

    // Una sola petición con todas las variantes como lista
    const payloads: IVarianteRequest[] = [
      // Formulario principal — lleva las imágenes
      { productoId, ...this.form.value, listImagenes: this.imagenesCargadas },
      // Variantes extra — sin imágenes para no duplicar el base64
      ...this.variantesExtras.map(e => ({
        productoId,
        ...e.form.value,
        talla: e.talla,
        listImagenes: []
      }))
    ];

    this.varianteService.save(payloads).subscribe({
      next: () => this.onExito(),
      error: () => { this.guardando = false; }
    });
  }

  private onExito(): void {
    this.varianteService.invalidarCache();
    this.guardando = false;
    const total = this.variantesExtras.length + 1;
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
    this.productoSeleccionado = null;
    this.terminoProducto = '';
    this.imagenesCargadas = [];
    this.variantesExtras = [];
    this.tallasNum.forEach(t => { t.checked = false; t.stock = 0; });
    this.tallasLetras = [];
    if (this.canvasRef) {
      const ctx = this.canvasRef.nativeElement.getContext('2d')!;
      ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }
  }
}
