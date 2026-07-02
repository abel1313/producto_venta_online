import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import {
  ProductoMasVendido,
  ReporteCliente,
  ReporteDiario,
  ReporteMensual,
  ReportesService,
} from './service/reportes.service';
import { ClienteService } from '../clietes/cliente.service';
import { IClienteBusquedaDto } from '../productos/producto/detalle-productos/models/pedidos.model';

Chart.register(...registerables);

type Tab = 'diario' | 'mensual' | 'cliente' | 'masVendidos';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barCanvas')          barCanvasRef!:          ElementRef<HTMLCanvasElement>;
  @ViewChild('masVendidosCanvas')  masVendidosCanvasRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('clienteCanvas')      clienteCanvasRef!:      ElementRef<HTMLCanvasElement>;

  tab: Tab = 'diario';
  private barChart:          Chart | null = null;
  private masVendidosChart:  Chart | null = null;
  private clienteChart:      Chart | null = null;

  // — Diario —
  fechaDiario: string = this.hoy();
  diario: ReporteDiario | null = null;
  cargandoDiario = false;

  // — Mensual —
  mesSeleccionado: string = this.mesActual();
  mensual: ReporteMensual | null = null;
  cargandoMensual = false;
  private pendingMensual: ReporteMensual | null = null;

  // — Por cliente —
  terminoCliente   = '';
  clientesSugeridos: IClienteBusquedaDto[] = [];
  clienteSeleccionado: IClienteBusquedaDto | null = null;
  mostrarDropdownCliente = false;
  reporteCliente: ReporteCliente | null = null;
  cargandoCliente = false;
  private pendingCliente: ReporteCliente | null = null;
  private clienteSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // — Más vendidos —
  desdeVendidos: string = this.primerDiaMes();
  hastaVendidos: string = this.hoy();
  limiteVendidos = 10;
  masVendidos: ProductoMasVendido[] = [];
  cargandoVendidos = false;
  private pendingVendidos: ProductoMasVendido[] | null = null;

  constructor(
    private readonly svc: ReportesService,
    private readonly clienteService: ClienteService,
  ) {}

  ngOnInit(): void {
    this.buscarDiario();
    this.clienteSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(t => t.length >= 2
        ? this.clienteService.buscarClientes(t, 0, 8)
        : [null]
      )
    ).subscribe(res => {
      this.clientesSugeridos = res?.data?.list ?? [];
      this.mostrarDropdownCliente = this.clientesSugeridos.length > 0;
    });
  }

  ngAfterViewInit(): void {
    if (this.pendingMensual) { this.renderMensualChart(this.pendingMensual); this.pendingMensual = null; }
    if (this.pendingVendidos) { this.renderMasVendidosChart(this.pendingVendidos); this.pendingVendidos = null; }
    if (this.pendingCliente) { this.renderClienteChart(this.pendingCliente); this.pendingCliente = null; }
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.masVendidosChart?.destroy();
    this.clienteChart?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.mostrarDropdownCliente = false;
    if (t === 'mensual' && this.mensual) {
      setTimeout(() => this.renderMensualChart(this.mensual!), 50);
    }
    if (t === 'masVendidos' && this.masVendidos.length > 0) {
      setTimeout(() => this.renderMasVendidosChart(this.masVendidos), 50);
    }
    if (t === 'cliente' && this.reporteCliente) {
      setTimeout(() => this.renderClienteChart(this.reporteCliente!), 50);
    }
  }

  // ── DIARIO ─────────────────────────────────────────────────────────────────

  buscarDiario(): void {
    if (!this.fechaDiario) return;
    this.cargandoDiario = true;
    this.diario = null;
    this.svc.getDiario(this.fechaDiario).subscribe({
      next: d => { this.diario = d; this.cargandoDiario = false; },
      error: err => {
        this.cargandoDiario = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el reporte diario.' });
      },
    });
  }

  // ── MENSUAL ────────────────────────────────────────────────────────────────

  buscarMensual(): void {
    if (!this.mesSeleccionado) return;
    this.cargandoMensual = true;
    this.mensual = null;
    this.svc.getMensual(this.mesSeleccionado).subscribe({
      next: m => {
        this.mensual = m;
        this.cargandoMensual = false;
        setTimeout(() => {
          if (this.barCanvasRef) { this.renderMensualChart(m); }
          else { this.pendingMensual = m; }
        }, 50);
      },
      error: err => {
        this.cargandoMensual = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el reporte mensual.' });
      },
    });
  }

  private renderMensualChart(m: ReporteMensual): void {
    this.barChart?.destroy();
    if (!this.barCanvasRef?.nativeElement) return;
    const [anio, mes] = m.mes.split('-').map(Number);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const mapaVentas    = new Map<string, number>();
    const mapaGanancias = new Map<string, number>();
    m.porDia.forEach(d => { mapaVentas.set(d.fecha, d.totalVenta); mapaGanancias.set(d.fecha, d.totalGanancia); });
    const labels: string[] = [];
    const ventas: number[] = [];
    const ganancias: number[] = [];
    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = `${m.mes}-${String(d).padStart(2, '0')}`;
      labels.push(String(d));
      ventas.push(mapaVentas.get(fecha) ?? 0);
      ganancias.push(mapaGanancias.get(fecha) ?? 0);
    }
    this.barChart = new Chart(this.barCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Ventas ($)',
            data: ventas,
            backgroundColor: 'rgba(99,102,241,.55)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Ganancia ($)',
            data: ganancias,
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.15)' } },
          x: { ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 10 } }, grid: { display: false } },
        },
      },
    } as any);
  }

  // ── CLIENTE ────────────────────────────────────────────────────────────────

  onTerminoClienteChange(): void {
    this.clienteSeleccionado = null;
    this.reporteCliente      = null;
    this.clienteSearch$.next(this.terminoCliente);
  }

  seleccionarCliente(c: IClienteBusquedaDto): void {
    this.clienteSeleccionado   = c;
    this.terminoCliente        = `${c.nombrePersona} ${c.apeidoPaterno}`.trim();
    this.clientesSugeridos     = [];
    this.mostrarDropdownCliente = false;
    this.cargarReporteCliente(c.id);
  }

  private cargarReporteCliente(id: number): void {
    this.cargandoCliente = true;
    this.reporteCliente  = null;
    this.svc.getCliente(id).subscribe({
      next: c => {
        this.reporteCliente  = c;
        this.cargandoCliente = false;
        if (c.ventas.length > 1) {
          setTimeout(() => {
            if (this.clienteCanvasRef) { this.renderClienteChart(c); }
            else { this.pendingCliente = c; }
          }, 50);
        }
      },
      error: err => {
        this.cargandoCliente = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el reporte del cliente.' });
      },
    });
  }

  private renderClienteChart(c: ReporteCliente): void {
    this.clienteChart?.destroy();
    if (!this.clienteCanvasRef?.nativeElement) return;
    const sorted = [...c.ventas].sort((a, b) => a.fechaVenta.localeCompare(b.fechaVenta));
    const labels = sorted.map(v => this.formatFecha(v.fechaVenta));
    const datos  = sorted.map(v => v.totalVenta);
    this.clienteChart = new Chart(this.clienteCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total compra ($)',
          data: datos,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.15)' } },
          x: { ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 10 } }, grid: { display: false } },
        },
      },
    } as any);
  }

  // ── MÁS VENDIDOS ──────────────────────────────────────────────────────────

  buscarMasVendidos(): void {
    if (!this.desdeVendidos || !this.hastaVendidos) return;
    this.cargandoVendidos = true;
    this.masVendidos = [];
    this.svc.getMasVendidos(this.desdeVendidos, this.hastaVendidos, this.limiteVendidos).subscribe({
      next: v => {
        this.masVendidos = v;
        this.cargandoVendidos = false;
        if (v.length > 0) {
          setTimeout(() => {
            if (this.masVendidosCanvasRef) { this.renderMasVendidosChart(v); }
            else { this.pendingVendidos = v; }
          }, 50);
        }
      },
      error: err => {
        this.cargandoVendidos = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el ranking de productos.' });
      },
    });
  }

  private renderMasVendidosChart(items: ProductoMasVendido[]): void {
    this.masVendidosChart?.destroy();
    if (!this.masVendidosCanvasRef?.nativeElement) return;
    const top = items.slice(0, 10);
    const labels = top.map(p => {
      const det = [p.talla, p.color].filter(Boolean).join(' / ');
      return det ? `${p.productoNombre} (${det})` : p.productoNombre;
    });
    const datos = top.map(p => p.cantidadVendida);
    this.masVendidosChart = new Chart(this.masVendidosCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Unidades vendidas',
          data: datos,
          backgroundColor: [
            'rgba(99,102,241,.8)', 'rgba(79,70,229,.8)', 'rgba(16,163,74,.8)',
            'rgba(245,158,11,.8)', 'rgba(239,68,68,.8)', 'rgba(14,165,233,.8)',
            'rgba(168,85,247,.8)', 'rgba(236,72,153,.8)', 'rgba(20,184,166,.8)',
            'rgba(251,146,60,.8)',
          ],
          borderWidth: 0,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(148,163,184,.15)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
        },
      },
    } as any);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private mesActual(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private primerDiaMes(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  }

  formatFecha(iso: string): string {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatFechaHora(iso: string): string {
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
