import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { aIsoLocal } from '../shared/fecha.util';
import { temaColor } from '../shared/chart-tema.util';
import { DashboardResumen, DashboardService, MesDeVentas, VentasPorFormaDePago } from './service/dashboard.service';

Chart.register(...registerables);

type Periodo = 'mes' | 'mesAnterior' | 'noventa';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  resumen: DashboardResumen | null = null;
  cargando = false;
  ultimaActualizacion: Date | null = null;

  // — Gráficas —
  @ViewChild('formaCanvas')  formaCanvasRef?:  ElementRef<HTMLCanvasElement>;
  @ViewChild('mensualCanvas') mensualCanvasRef?: ElementRef<HTMLCanvasElement>;

  periodo: Periodo = 'mes';
  porForma: VentasPorFormaDePago | null = null;
  meses: MesDeVentas[] = [];
  cargandoGraficas = false;
  errorGraficas: string | null = null;
  private formaChart: Chart | null = null;
  private mensualChart: Chart | null = null;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly svc: DashboardService) {}

  ngOnInit(): void {
    this.cargar();
    // Refresco automático cada 5 minutos
    this.refreshTimer = setInterval(() => this.cargar(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.formaChart?.destroy();
    this.mensualChart?.destroy();
  }

  cargar(): void {
    this.cargarGraficas();
    this.cargando = true;
    this.svc.getResumen().subscribe({
      next: data => {
        this.resumen = data;
        this.ultimaActualizacion = new Date();
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cargar el dashboard.',
        });
      },
    });
  }

  formatPeso(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  }

  formatHora(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  // ── GRÁFICAS ───────────────────────────────────────────────────────────────

  cambiarPeriodo(p: Periodo): void {
    this.periodo = p;
    this.cargarGraficas();
  }

  /** Fechas del periodo elegido, con el calendario local (no UTC). */
  private rangoDelPeriodo(): { desde: string; hasta: string } {
    const hoy = new Date();
    if (this.periodo === 'mesAnterior') {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const ultimo = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { desde: aIsoLocal(primero), hasta: aIsoLocal(ultimo) };
    }
    if (this.periodo === 'noventa') {
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - 89);
      return { desde: aIsoLocal(inicio), hasta: aIsoLocal(hoy) };
    }
    return { desde: aIsoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aIsoLocal(hoy) };
  }

  cargarGraficas(): void {
    const { desde, hasta } = this.rangoDelPeriodo();
    this.cargandoGraficas = true;
    this.errorGraficas = null;
    let pendientes = 2;
    const terminar = () => {
      if (--pendientes === 0) {
        this.cargandoGraficas = false;
        // Los canvas ya existen en la pantalla; se dibuja en el siguiente ciclo.
        setTimeout(() => { this.dibujarForma(); this.dibujarMensual(); });
      }
    };
    this.svc.getVentasPorFormaPago(desde, hasta).subscribe({
      next: d => { this.porForma = d; terminar(); },
      error: err => { this.errorGraficas = err?.error?.mensaje ?? 'No se pudieron cargar las gráficas.'; terminar(); }
    });
    this.svc.getVentasGastosMensual(12).subscribe({
      next: d => { this.meses = d; terminar(); },
      error: err => { this.errorGraficas = err?.error?.mensaje ?? 'No se pudieron cargar las gráficas.'; terminar(); }
    });
  }

  /** Colores de las porciones, tomados del diseño (cambian con Personalización y con día/noche). */
  private coloresDeLasFormas(cantidad: number): string[] {
    const fichas = ['--app-accent', '--pk-info', '--pk-success', '--pk-warning', '--pk-danger'];
    return Array.from({ length: cantidad }, (_, i) => temaColor(fichas[i % fichas.length], 0.85));
  }

  colorDeLaForma(i: number): string {
    return this.coloresDeLasFormas(i + 1)[i];
  }

  private dibujarForma(): void {
    this.formaChart?.destroy();
    this.formaChart = null;
    const canvas = this.formaCanvasRef?.nativeElement;
    const formas = this.porForma?.formas ?? [];
    if (!canvas || !formas.length) return;
    this.formaChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: formas.map(f => f.forma),
        datasets: [{
          data: formas.map(f => f.total),
          backgroundColor: this.coloresDeLasFormas(formas.length),
          borderColor: temaColor('--card-body-bg'),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },   // la leyenda es la tabla de al lado (se lee mejor y es accesible)
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${this.formatPeso(ctx.parsed as number)}` } }
        }
      }
    });
  }

  private dibujarMensual(): void {
    this.mensualChart?.destroy();
    this.mensualChart = null;
    const canvas = this.mensualCanvasRef?.nativeElement;
    if (!canvas || !this.meses.length) return;
    const texto = temaColor('--app-text-faint');
    const linea = temaColor('--app-border');
    this.mensualChart = new Chart(canvas, {
      data: {
        labels: this.meses.map(m => this.etiquetaDelMes(m.mes)),
        datasets: [
          { type: 'bar', label: 'Ventas', data: this.meses.map(m => m.ventas), backgroundColor: temaColor('--app-accent', 0.75), borderRadius: 4, order: 2 },
          { type: 'bar', label: 'Gastos', data: this.meses.map(m => m.gastos), backgroundColor: temaColor('--pk-warning', 0.75), borderRadius: 4, order: 2 },
          { type: 'line', label: 'Ganancia neta', data: this.meses.map(m => m.gananciaNeta), borderColor: temaColor('--pk-success'),
            backgroundColor: temaColor('--pk-success'), tension: 0.3, pointRadius: 3, borderWidth: 2, order: 1 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: texto, boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${this.formatPeso(ctx.parsed.y)}` } }
        },
        scales: {
          x: { ticks: { color: texto, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: texto, font: { size: 11 }, callback: v => this.formatPesoCorto(Number(v)) }, grid: { color: linea } }
        }
      }
    });
  }

  /** `2026-10` → `oct 26`. */
  etiquetaDelMes(mes: string): string {
    const [anio, m] = mes.split('-').map(Number);
    const nombre = new Date(anio, m - 1, 1).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
    return `${nombre} ${String(anio).slice(2)}`;
  }

  get hayVentasEnElPeriodo(): boolean {
    return (this.porForma?.formas.length ?? 0) > 0;
  }

  get hayMovimientoEnLosMeses(): boolean {
    return this.meses.some(m => m.ventas > 0 || m.gastos > 0);
  }

  get tituloDelPeriodo(): string {
    return this.periodo === 'mes' ? 'este mes' : this.periodo === 'mesAnterior' ? 'el mes anterior' : 'los últimos 90 días';
  }

  private formatPesoCorto(n: number): string {
    return Math.abs(n) >= 1000 ? `$${(n / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k` : `$${n}`;
  }
}
