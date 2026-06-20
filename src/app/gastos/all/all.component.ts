import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  CATEGORIA_LABELS, CATEGORIAS, CategoriaGasto,
  IGasto, IGastoReporte, IPaginadoGasto, IPaginadoVenta, IVenta
} from '../models/IGastos.model';
import { GastosService } from '../service/gastos.service';

type Tab = 'gastos' | 'ventas' | 'reporte';

@Component({
  selector: 'app-all',
  templateUrl: './all.component.html',
  styleUrls: ['./all.component.scss']
})
export class AllComponent implements OnInit {

  tab: Tab = 'gastos';

  readonly categorias      = CATEGORIAS;
  readonly categoriaLabels = CATEGORIA_LABELS;

  // ── Gastos ────────────────────────────────────────────────────────
  gastos: IGasto[]                        = [];
  gastosPaginado: IPaginadoGasto | null   = null;
  cargandoGastos                          = false;
  eliminandoId: number | null             = null;

  modoRangoG      = false;
  filtroFechaG    = this.hoy();
  filtroInicioG   = '';
  filtroFinG      = '';
  filtroCategoria = '';
  pagGastos       = 0;

  get totalGastosFiltrados(): number {
    return this.gastos.reduce((s, g) => s + (g.monto ?? 0), 0);
  }

  // ── Ventas ────────────────────────────────────────────────────────
  ventas: IVenta[]                       = [];
  ventasPaginado: IPaginadoVenta | null  = null;
  cargandoVentas                         = false;

  modoRangoV    = false;
  filtroFechaV  = this.hoy();
  filtroInicioV = '';
  filtroFinV    = '';
  pagVentas     = 0;

  get totalVentasFiltradas(): number {
    return this.ventas.reduce((s, v) => s + (v.totalVenta ?? 0), 0);
  }
  get totalGananciaFiltrada(): number {
    return this.ventas.reduce((s, v) => s + (v.gananciaTotal ?? 0), 0);
  }

  // ── Reporte ───────────────────────────────────────────────────────
  reporte: IGastoReporte | null = null;
  cargandoReporte               = false;
  reporteInicio                 = this.primerDiaMes();
  reporteFin                    = this.hoy();

  get categoriaKeysReporte(): CategoriaGasto[] {
    if (!this.reporte?.gastosPorCategoria) return [];
    return Object.keys(this.reporte.gastosPorCategoria) as CategoriaGasto[];
  }

  constructor(
    private readonly gastosService: GastosService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.cargarGastos();
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private primerDiaMes(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // ── Tab navigation ────────────────────────────────────────────────
  cambiarTab(t: Tab): void {
    this.tab = t;
    if (t === 'ventas'  && !this.ventas.length)  this.cargarVentas();
    if (t === 'reporte' && !this.reporte)         this.cargarReporte();
  }

  // ── Navegación al form ────────────────────────────────────────────
  nuevoGasto(): void {
    this.gastosService.setGastoEditar(null);
    this.router.navigate(['gastos/agregar']);
  }

  editarGasto(g: IGasto): void {
    this.gastosService.setGastoEditar(g);
    this.router.navigate(['gastos/agregar']);
  }

  // ── Gastos — búsqueda ─────────────────────────────────────────────
  cargarGastos(page = 0): void {
    this.cargandoGastos = true;
    this.pagGastos = page;
    const params: Parameters<GastosService['buscarGastos']>[0] = { page, size: 20 };
    if (this.modoRangoG) {
      if (this.filtroInicioG) params.fechaInicio = this.filtroInicioG;
      if (this.filtroFinG)    params.fechaFin    = this.filtroFinG;
    } else {
      if (this.filtroFechaG)  params.fecha = this.filtroFechaG;
    }
    if (this.filtroCategoria) params.categoria = this.filtroCategoria;

    this.gastosService.buscarGastos(params)
      .pipe(finalize(() => this.cargandoGastos = false))
      .subscribe({
        next: res => {
          this.gastosPaginado = res ?? null;
          this.gastos         = res?.t ?? [];
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar los gastos.' });
        }
      });
  }

  // ── Eliminar ──────────────────────────────────────────────────────
  confirmarEliminar(g: IGasto): void {
    if (!g.id || this.eliminandoId) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar gasto?',
      text: `${g.descripcion} — $${g.monto}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.eliminandoId = g.id!;
      this.gastosService.deleteGasto(g.id!).subscribe({
        next: () => {
          this.eliminandoId = null;
          this.cargarGastos(this.pagGastos);
        },
        error: err => {
          this.eliminandoId = null;
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo eliminar.' });
        }
      });
    });
  }

  // ── Ventas ────────────────────────────────────────────────────────
  cargarVentas(page = 0): void {
    this.cargandoVentas = true;
    this.pagVentas = page;
    const params: Parameters<GastosService['buscarVentas']>[0] = { page, size: 20 };
    if (this.modoRangoV) {
      if (this.filtroInicioV) params.fechaInicio = this.filtroInicioV;
      if (this.filtroFinV)    params.fechaFin    = this.filtroFinV;
    } else {
      if (this.filtroFechaV)  params.fecha = this.filtroFechaV;
    }
    this.gastosService.buscarVentas(params)
      .pipe(finalize(() => this.cargandoVentas = false))
      .subscribe({
        next: res => {
          this.ventasPaginado = res ?? null;
          this.ventas         = res?.t ?? [];
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar las ventas.' });
        }
      });
  }

  nombreCliente(v: IVenta): string {
    return [v.cliente?.nombrePersona, v.cliente?.apellidoPaterno].filter(Boolean).join(' ') || '—';
  }

  // ── Reporte ───────────────────────────────────────────────────────
  cargarReporte(): void {
    this.cargandoReporte = true;
    this.gastosService.getReporte(this.reporteInicio, this.reporteFin)
      .pipe(finalize(() => this.cargandoReporte = false))
      .subscribe({
        next: res => { this.reporte = res ?? null; },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar el reporte.' });
        }
      });
  }
}
