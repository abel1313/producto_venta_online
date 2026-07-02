import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import {
  ProductoMasVendido,
  ReporteCliente,
  ReporteDiario,
  ReporteMensual,
  ReportesService,
} from './service/reportes.service';

Chart.register(...registerables);

type Tab = 'diario' | 'mensual' | 'cliente' | 'masVendidos';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barCanvas') barCanvasRef!: ElementRef<HTMLCanvasElement>;

  tab: Tab = 'diario';
  private barChart: Chart | null = null;

  // — Diario —
  fechaDiario: string = this.hoy();
  diario: ReporteDiario | null = null;
  cargandoDiario = false;

  // — Mensual —
  mesSeleccionado: string = this.mesActual();
  mensual: ReporteMensual | null = null;
  cargandoMensual = false;
  private pendingChartData: { labels: string[]; valores: number[] } | null = null;

  // — Por cliente —
  clienteId: number | null = null;
  reporteCliente: ReporteCliente | null = null;
  cargandoCliente = false;

  // — Más vendidos —
  desdeVendidos: string = this.primerDiaMes();
  hastaVendidos: string = this.hoy();
  limiteVendidos = 10;
  masVendidos: ProductoMasVendido[] = [];
  cargandoVendidos = false;

  constructor(private readonly svc: ReportesService) {}

  ngOnInit(): void {
    this.buscarDiario();
  }

  ngAfterViewInit(): void {
    if (this.pendingChartData) {
      this.renderChart(this.pendingChartData.labels, this.pendingChartData.valores);
      this.pendingChartData = null;
    }
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'mensual' && this.mensual && this.barCanvasRef) {
      setTimeout(() => this.renderChart(...this.getChartArrays(this.mensual!)), 50);
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
          const [labels, valores] = this.getChartArrays(m);
          if (this.barCanvasRef) {
            this.renderChart(labels, valores);
          } else {
            this.pendingChartData = { labels, valores };
          }
        }, 50);
      },
      error: err => {
        this.cargandoMensual = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el reporte mensual.' });
      },
    });
  }

  private getChartArrays(m: ReporteMensual): [string[], number[]] {
    const [anio, mes] = m.mes.split('-').map(Number);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const mapaVentas = new Map<string, number>();
    m.porDia.forEach(d => mapaVentas.set(d.fecha, d.totalVenta));
    const labels: string[] = [];
    const valores: number[] = [];
    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = `${m.mes}-${String(d).padStart(2, '0')}`;
      labels.push(String(d));
      valores.push(mapaVentas.get(fecha) ?? 0);
    }
    return [labels, valores];
  }

  private renderChart(labels: string[], valores: number[]): void {
    this.barChart?.destroy();
    if (!this.barCanvasRef?.nativeElement) return;
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: valores,
          backgroundColor: 'rgba(99,102,241,.65)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 4,
          label: 'Ventas ($)',
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
    };
    this.barChart = new Chart(this.barCanvasRef.nativeElement, config);
  }

  // ── CLIENTE ────────────────────────────────────────────────────────────────

  buscarCliente(): void {
    if (!this.clienteId) return;
    this.cargandoCliente = true;
    this.reporteCliente = null;
    this.svc.getCliente(this.clienteId).subscribe({
      next: c => { this.reporteCliente = c; this.cargandoCliente = false; },
      error: err => {
        this.cargandoCliente = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el reporte del cliente.' });
      },
    });
  }

  // ── MÁS VENDIDOS ──────────────────────────────────────────────────────────

  buscarMasVendidos(): void {
    if (!this.desdeVendidos || !this.hastaVendidos) return;
    this.cargandoVendidos = true;
    this.masVendidos = [];
    this.svc.getMasVendidos(this.desdeVendidos, this.hastaVendidos, this.limiteVendidos).subscribe({
      next: v => { this.masVendidos = v; this.cargandoVendidos = false; },
      error: err => {
        this.cargandoVendidos = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cargar el ranking de productos.' });
      },
    });
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
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatFechaHora(iso: string): string {
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
