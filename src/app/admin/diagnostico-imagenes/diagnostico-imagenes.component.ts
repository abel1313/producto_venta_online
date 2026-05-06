import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';

interface IImagenLocalDB {
  imagenId: number;
  nombreImagen: string;
  extension: string;
  rutaDisco: string;
}

interface IDiagnosticoProducto {
  productoId: number;
  nombreProducto: string;
  totalImagenesLocalDB: number;
  imagenesLocalDB: IImagenLocalDB[];
  imagenPresenteEnMicroservicio: boolean;
  detalleExternoLista: string;
}

interface IDiagnosticoVariante {
  varianteId: number;
  totalImagenesLocalDB: number;
  imagenesLocalDB: IImagenLocalDB[];
  idsConDatosEnMicroservicio: number[];
  idsSinDatosEnMicroservicio: number[];
  consistente: boolean;
}

type EstadoDiagnostico = 'sin-registro' | 'archivo-perdido' | 'ok';

@Component({
  selector: 'app-diagnostico-imagenes',
  templateUrl: './diagnostico-imagenes.component.html',
  styleUrls: ['./diagnostico-imagenes.component.scss']
})
export class DiagnosticoImagenesComponent implements OnDestroy {

  tab: 'producto' | 'variante' = 'producto';

  // ── Búsqueda producto ──────────────────────────────────────────────
  terminoProducto = '';
  productosEncontrados: IProductoDTO[] = [];
  productoSeleccionado: IProductoDTO | null = null;
  buscandoProducto = false;

  // ── Búsqueda variante ──────────────────────────────────────────────
  terminoVariante = '';
  variantesEncontradas: IVarianteResumen[] = [];
  varianteSeleccionada: IVarianteResumen | null = null;
  buscandoVariante = false;

  // ── Diagnóstico ────────────────────────────────────────────────────
  cargando = false;
  resultadoProducto: IDiagnosticoProducto | null = null;
  resultadoVariante: IDiagnosticoVariante | null = null;
  error: string | null = null;

  private readonly prodSubject = new Subject<string>();
  private readonly varSubject  = new Subject<string>();
  private readonly destroy$    = new Subject<void>();

  constructor(
    private readonly productoService: ProductoService,
    private readonly varianteService: VarianteService
  ) {
    this.prodSubject.pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(term => this.buscarProductos(term));

    this.varSubject.pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(term => this.buscarVariantes(term));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Tabs ───────────────────────────────────────────────────────────

  cambiarTab(tab: 'producto' | 'variante'): void {
    this.tab = tab;
    this.limpiarTodo();
  }

  private limpiarTodo(): void {
    this.terminoProducto      = '';
    this.terminoVariante      = '';
    this.productosEncontrados = [];
    this.variantesEncontradas = [];
    this.productoSeleccionado = null;
    this.varianteSeleccionada = null;
    this.resultadoProducto    = null;
    this.resultadoVariante    = null;
    this.error                = null;
  }

  // ── Búsqueda ───────────────────────────────────────────────────────

  onBuscarProducto(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.terminoProducto      = term;
    this.productoSeleccionado = null;
    this.resultadoProducto    = null;
    this.error                = null;
    if (term.trim().length >= 3) {
      this.prodSubject.next(term.trim());
    } else {
      this.productosEncontrados = [];
    }
  }

  onBuscarVariante(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.terminoVariante      = term;
    this.varianteSeleccionada = null;
    this.resultadoVariante    = null;
    this.error                = null;
    if (term.trim().length >= 3) {
      this.varSubject.next(term.trim());
    } else {
      this.variantesEncontradas = [];
    }
  }

  private buscarProductos(term: string): void {
    this.buscandoProducto = true;
    this.productoService.getDataNombreCodigoBarra(1, 10, term).subscribe({
      next: res => { this.productosEncontrados = res.t ?? []; this.buscandoProducto = false; },
      error: ()  => { this.buscandoProducto = false; }
    });
  }

  private buscarVariantes(term: string): void {
    this.buscandoVariante = true;
    this.varianteService.buscar({ termino: term, pagina: 1, size: 10 }).subscribe({
      next: res => { this.variantesEncontradas = res.t ?? []; this.buscandoVariante = false; },
      error: ()  => { this.buscandoVariante = false; }
    });
  }

  // ── Selección → diagnóstico automático ────────────────────────────

  seleccionarProducto(p: IProductoDTO): void {
    this.productoSeleccionado = p;
    this.terminoProducto      = p.nombre;
    this.productosEncontrados = [];
    this.consultarProducto(p.idProducto);
  }

  seleccionarVariante(v: IVarianteResumen): void {
    this.varianteSeleccionada = v;
    const etiqueta = [v.marca, v.color, v.talla, v.presentacion].filter(Boolean).join(' · ');
    this.terminoVariante      = `ID ${v.id}${etiqueta ? ' — ' + etiqueta : ''}`;
    this.variantesEncontradas = [];
    this.consultarVariante(v.id);
  }

  private consultarProducto(id: number): void {
    this.cargando          = true;
    this.error             = null;
    this.resultadoProducto = null;
    this.productoService.diagnosticoImagenes(id).subscribe({
      next: res => { this.resultadoProducto = res; this.cargando = false; },
      error: ()  => { this.error = 'No se pudo consultar el diagnóstico del producto'; this.cargando = false; }
    });
  }

  private consultarVariante(id: number): void {
    this.cargando          = true;
    this.error             = null;
    this.resultadoVariante = null;
    this.varianteService.diagnosticoImagenes(id).subscribe({
      next: res => { this.resultadoVariante = res; this.cargando = false; },
      error: ()  => { this.error = 'No se pudo consultar el diagnóstico de la variante'; this.cargando = false; }
    });
  }

  // ── Estado calculado ───────────────────────────────────────────────

  get estadoProducto(): EstadoDiagnostico | null {
    if (!this.resultadoProducto) return null;
    if (this.resultadoProducto.totalImagenesLocalDB === 0) return 'sin-registro';
    if (!this.resultadoProducto.imagenPresenteEnMicroservicio) return 'archivo-perdido';
    return 'ok';
  }

  get estadoVariante(): EstadoDiagnostico | null {
    if (!this.resultadoVariante) return null;
    if (this.resultadoVariante.totalImagenesLocalDB === 0) return 'sin-registro';
    if (!this.resultadoVariante.consistente) return 'archivo-perdido';
    return 'ok';
  }

  // ── Helpers ────────────────────────────────────────────────────────

  etiquetaVariante(v: IVarianteResumen): string {
    return [v.marca, v.color, v.talla, v.presentacion].filter(Boolean).join(' · ') || '—';
  }
}
