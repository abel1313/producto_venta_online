import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { temaColor } from '../../shared/chart-tema.util';
import { ClientesDelNegocio, CuandoSeVende, DashboardService, EntregasPorZona } from '../service/dashboard.service';

Chart.register(...registerables);

/**
 * Tres paneles del Dashboard para conocer el negocio: cuándo se vende (mapa de calor por día y hora), quién te compra
 * (nuevos contra recurrentes) y a dónde van los pedidos. Cada panel carga solo, y si uno falla los otros siguen. Se vuelve a
 * cargar cuando el Dashboard cambia `version`.
 */
@Component({
  selector: 'app-graficas-negocio',
  templateUrl: './graficas-negocio.component.html',
  styleUrls: ['../dashboard.component.scss'],
})
export class GraficasNegocioComponent implements OnChanges, OnDestroy {
  @Input() version = 0;

  @ViewChild('clientesCanvas') clientesCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('zonasCanvas')    zonasCanvasRef?:    ElementRef<HTMLCanvasElement>;

  // — Cuándo se vende —
  diasVenta = 90;
  cuando: CuandoSeVende | null = null;
  errorCuando: string | null = null;
  readonly diasDeLaSemana = [1, 2, 3, 4, 5, 6, 7];
  private readonly nombresCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // — Clientes —
  mesesClientes = 6;
  clientes: ClientesDelNegocio | null = null;
  errorClientes: string | null = null;

  // — Entregas por zona —
  diasZonas = 90;
  zonas: EntregasPorZona | null = null;
  errorZonas: string | null = null;

  private clientesChart: Chart | null = null;
  private zonasChart: Chart | null = null;

  constructor(private readonly svc: DashboardService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['version']) {
      this.cargarCuando();
      this.cargarClientes();
      this.cargarZonas();
    }
  }

  ngOnDestroy(): void {
    this.clientesChart?.destroy();
    this.zonasChart?.destroy();
  }

  // ── Cuándo se vende ────────────────────────────────────────────────────────
  cambiarDiasVenta(dias: number): void {
    this.diasVenta = dias;
    this.cargarCuando();
  }

  private cargarCuando(): void {
    this.svc.getCuandoSeVende(this.diasVenta).subscribe({
      next: d => { this.cuando = d; this.errorCuando = null; },
      error: err => { this.errorCuando = err?.error?.mensaje ?? 'No se pudo cargar cuándo se vende.'; }
    });
  }

  get hayVentas(): boolean {
    return (this.cuando?.ventas ?? 0) > 0;
  }

  /** Horas que se muestran en el mapa: de la primera a la última con ventas, y al menos de 9 a 20. */
  get horas(): number[] {
    const conVentas = (this.cuando?.celdas ?? []).map(c => c.hora);
    const desde = Math.min(9, ...(conVentas.length ? conVentas : [9]));
    const hasta = Math.max(20, ...(conVentas.length ? conVentas : [20]));
    return Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  }

  private celda(dia: number, hora: number) {
    return this.cuando?.celdas.find(c => c.diaSemana === dia && c.hora === hora);
  }

  private get maximoDeUnaCelda(): number {
    return Math.max(0, ...(this.cuando?.celdas ?? []).map(c => c.total));
  }

  /** La celda más oscura es la que más vendió; sin ventas no se pinta. */
  colorDeCelda(dia: number, hora: number): string | null {
    const c = this.celda(dia, hora);
    if (!c || !this.maximoDeUnaCelda) return null;
    const intensidad = Math.max(12, Math.round((c.total / this.maximoDeUnaCelda) * 100));
    return `color-mix(in srgb, var(--app-accent) ${intensidad}%, transparent)`;
  }

  /** En las celdas casi llenas de color de marca el número usa el color pensado para ir encima de la marca. */
  colorDelNumero(dia: number, hora: number): string | null {
    const c = this.celda(dia, hora);
    if (!c || !this.maximoDeUnaCelda) return null;
    return c.total / this.maximoDeUnaCelda > 0.6 ? 'var(--app-accent-ink)' : null;
  }

  ventasDeCelda(dia: number, hora: number): number {
    return this.celda(dia, hora)?.ventas ?? 0;
  }

  textoDeCelda(dia: number, hora: number): string {
    const c = this.celda(dia, hora);
    const nombre = this.cuando?.porDia.find(d => d.diaSemana === dia)?.nombre ?? '';
    const cuando = `${nombre} a las ${this.horaLarga(hora)}`;
    return c ? `${cuando}: ${c.ventas} venta(s), ${this.peso(c.total)}` : `${cuando}: sin ventas`;
  }

  nombreCorto(dia: number): string {
    return this.nombresCortos[dia - 1];
  }

  nombreDelDia(dia: number | null): string {
    return dia == null ? '—' : (this.cuando?.porDia.find(d => d.diaSemana === dia)?.nombre ?? '—');
  }

  horaLarga(hora: number | null): string {
    if (hora == null) return '—';
    const h12 = hora % 12 === 0 ? 12 : hora % 12;
    return `${h12} ${hora < 12 ? 'a. m.' : 'p. m.'}`;
  }

  // ── Clientes ───────────────────────────────────────────────────────────────
  cambiarMesesClientes(meses: number): void {
    this.mesesClientes = meses;
    this.cargarClientes();
  }

  private cargarClientes(): void {
    this.svc.getClientes(this.mesesClientes).subscribe({
      next: d => { this.clientes = d; this.errorClientes = null; setTimeout(() => this.dibujarClientes()); },
      error: err => { this.errorClientes = err?.error?.mensaje ?? 'No se pudieron cargar los clientes.'; }
    });
  }

  get hayClientes(): boolean {
    return (this.clientes?.clientes ?? 0) > 0;
  }

  private dibujarClientes(): void {
    this.clientesChart?.destroy();
    this.clientesChart = null;
    const canvas = this.clientesCanvasRef?.nativeElement;
    const meses = this.clientes?.porMes ?? [];
    if (!canvas || !this.hayClientes) return;
    const texto = temaColor('--app-text-faint');
    this.clientesChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: meses.map(m => this.etiquetaDelMes(m.mes)),
        datasets: [
          { label: 'Nuevos', data: meses.map(m => m.nuevos), backgroundColor: temaColor('--app-accent', 0.85), borderRadius: 4, stack: 'c' },
          { label: 'Recurrentes', data: meses.map(m => m.recurrentes), backgroundColor: temaColor('--pk-success', 0.8), borderRadius: 4, stack: 'c' },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { color: texto, boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const m = meses[ctx.dataIndex];
                const dinero = ctx.datasetIndex === 0 ? m.totalNuevos : m.totalRecurrentes;
                return ` ${ctx.dataset.label}: ${ctx.parsed.y} cliente(s), ${this.peso(dinero)}`;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: texto, font: { size: 11 } }, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: texto, font: { size: 11 }, precision: 0 }, grid: { color: temaColor('--app-border') } }
        }
      }
    });
  }

  // ── Entregas por zona ──────────────────────────────────────────────────────
  cambiarDiasZonas(dias: number): void {
    this.diasZonas = dias;
    this.cargarZonas();
  }

  private cargarZonas(): void {
    this.svc.getEntregasPorZona(this.diasZonas).subscribe({
      next: d => { this.zonas = d; this.errorZonas = null; setTimeout(() => this.dibujarZonas()); },
      error: err => { this.errorZonas = err?.error?.mensaje ?? 'No se pudieron cargar las entregas.'; }
    });
  }

  get hayZonas(): boolean {
    return (this.zonas?.pedidos ?? 0) > 0;
  }

  private dibujarZonas(): void {
    this.zonasChart?.destroy();
    this.zonasChart = null;
    const canvas = this.zonasCanvasRef?.nativeElement;
    const zonas = this.zonas?.zonas ?? [];
    if (!canvas || !this.hayZonas) return;
    const texto = temaColor('--app-text-faint');
    this.zonasChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: zonas.map(z => this.recortar(z.zona, 26)),
        datasets: [{
          data: zonas.map(z => z.pedidos),
          // «Recoger en tienda» con otro color: no es una entrega, es gente que pasa por su pedido.
          backgroundColor: zonas.map(z => z.recogerEnTienda ? temaColor('--pk-info', 0.8) : temaColor('--app-accent', 0.85)),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: items => zonas[items[0].dataIndex].zona, label: ctx => ` ${ctx.parsed.x} pedido(s), ${this.peso(zonas[ctx.dataIndex].total)}` } }
        },
        scales: {
          x: { beginAtZero: true, ticks: { color: texto, font: { size: 11 }, precision: 0 }, grid: { color: temaColor('--app-border') } },
          y: { ticks: { color: texto, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  // ── Formato ────────────────────────────────────────────────────────────────
  /** `2026-10` → `oct 26`. */
  etiquetaDelMes(mes: string): string {
    const [anio, m] = mes.split('-').map(Number);
    const nombre = new Date(anio, m - 1, 1).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
    return `${nombre} ${String(anio).slice(2)}`;
  }

  peso(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  }

  private recortar(texto: string, max: number): string {
    return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
  }
}
