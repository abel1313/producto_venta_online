import { Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { temaColor } from '../../shared/chart-tema.util';
import { CapitalParado, DashboardService, DineroPorCobrar, PedidosPorEstado } from '../service/dashboard.service';

Chart.register(...registerables);

/**
 * Tres paneles del Dashboard para ver qué hacer esta semana: lo que te deben por antigüedad, la mercancía que no se mueve y
 * en qué punto están los pedidos. Cada panel carga solo, y si uno falla los otros siguen. Se vuelve a cargar cuando el Dashboard
 * cambia `version` (botón de actualizar y refresco de cada 5 minutos).
 */
@Component({
  selector: 'app-graficas-operacion',
  templateUrl: './graficas-operacion.component.html',
  styleUrls: ['../dashboard.component.scss'],
})
export class GraficasOperacionComponent implements OnChanges, OnDestroy {
  @Input() version = 0;

  @ViewChild('cobrarCanvas')  cobrarCanvasRef?:  ElementRef<HTMLCanvasElement>;
  @ViewChild('paradoCanvas')  paradoCanvasRef?:  ElementRef<HTMLCanvasElement>;
  @ViewChild('estadoCanvas')  estadoCanvasRef?:  ElementRef<HTMLCanvasElement>;

  porCobrar: DineroPorCobrar | null = null;
  errorCobrar: string | null = null;

  diasParado = 60;
  parado: CapitalParado | null = null;
  errorParado: string | null = null;

  estados: PedidosPorEstado | null = null;
  errorEstados: string | null = null;

  private cobrarChart: Chart | null = null;
  private paradoChart: Chart | null = null;
  private estadoChart: Chart | null = null;

  constructor(private readonly svc: DashboardService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['version']) this.cargarTodo();
  }

  ngOnDestroy(): void {
    this.cobrarChart?.destroy();
    this.paradoChart?.destroy();
    this.estadoChart?.destroy();
  }

  private cargarTodo(): void {
    this.cargarPorCobrar();
    this.cargarParado();
    this.cargarEstados();
  }

  // ── Por cobrar ─────────────────────────────────────────────────────────────
  private cargarPorCobrar(): void {
    this.svc.getPorCobrar().subscribe({
      next: d => { this.porCobrar = d; this.errorCobrar = null; setTimeout(() => this.dibujarCobrar()); },
      error: err => { this.errorCobrar = err?.error?.mensaje ?? 'No se pudo cargar lo que te deben.'; }
    });
  }

  private dibujarCobrar(): void {
    this.cobrarChart?.destroy();
    this.cobrarChart = null;
    const canvas = this.cobrarCanvasRef?.nativeElement;
    if (!canvas || !this.hayPorCobrar) return;
    const texto = temaColor('--app-text-faint');
    this.cobrarChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.porCobrar!.tramos.map(t => t.etiqueta),
        datasets: [{
          data: this.porCobrar!.tramos.map(t => t.saldo),
          backgroundColor: [temaColor('--pk-success', 0.8), temaColor('--pk-warning', 0.8), temaColor('--pk-danger', 0.8)],
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${this.peso(ctx.parsed.y)} en ${this.porCobrar!.tramos[ctx.dataIndex].pedidos} pedido(s)` } }
        },
        scales: {
          x: { ticks: { color: texto, font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: texto, font: { size: 11 }, callback: v => this.pesoCorto(Number(v)) }, grid: { color: temaColor('--app-border') } }
        }
      }
    });
  }

  get hayPorCobrar(): boolean {
    return (this.porCobrar?.pedidos ?? 0) > 0;
  }

  /** Color de la antigüedad de un caso: verde hasta 7 días, ámbar hasta 30, rojo después. */
  claseDeDias(dias: number): string {
    return dias <= 7 ? 'go-dias--ok' : dias <= 30 ? 'go-dias--ojo' : 'go-dias--mal';
  }

  // ── Capital parado ─────────────────────────────────────────────────────────
  cambiarDiasParado(dias: number): void {
    this.diasParado = dias;
    this.cargarParado();
  }

  private cargarParado(): void {
    this.svc.getCapitalParado(this.diasParado).subscribe({
      next: d => { this.parado = d; this.errorParado = null; setTimeout(() => this.dibujarParado()); },
      error: err => { this.errorParado = err?.error?.mensaje ?? 'No se pudo cargar la mercancía parada.'; }
    });
  }

  private dibujarParado(): void {
    this.paradoChart?.destroy();
    this.paradoChart = null;
    const canvas = this.paradoCanvasRef?.nativeElement;
    const mayores = this.parado?.mayores ?? [];
    if (!canvas || !mayores.length) return;
    const texto = temaColor('--app-text-faint');
    this.paradoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: mayores.map(a => this.recortar(a.nombre, 28)),
        datasets: [{ data: mayores.map(a => a.capital), backgroundColor: temaColor('--pk-warning', 0.8), borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => mayores[items[0].dataIndex].nombre,
              label: ctx => ` ${this.peso(ctx.parsed.x)} (${mayores[ctx.dataIndex].stock} pieza(s) a ${this.peso(mayores[ctx.dataIndex].costo)})`,
              afterLabel: ctx => ` ${this.textoSinVender(mayores[ctx.dataIndex].diasSinVender)}`
            }
          }
        },
        scales: {
          x: { beginAtZero: true, ticks: { color: texto, font: { size: 11 }, callback: v => this.pesoCorto(Number(v)) }, grid: { color: temaColor('--app-border') } },
          y: { ticks: { color: texto, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  get hayParado(): boolean {
    return (this.parado?.articulos ?? 0) > 0;
  }

  textoSinVender(dias: number | null): string {
    return dias == null ? 'Nunca se ha vendido' : `Sin venderse hace ${dias} días`;
  }

  // ── Pedidos por estado ─────────────────────────────────────────────────────
  private cargarEstados(): void {
    this.svc.getPedidosPorEstado(90).subscribe({
      next: d => { this.estados = d; this.errorEstados = null; setTimeout(() => this.dibujarEstados()); },
      error: err => { this.errorEstados = err?.error?.mensaje ?? 'No se pudieron cargar los pedidos.'; }
    });
  }

  private dibujarEstados(): void {
    this.estadoChart?.destroy();
    this.estadoChart = null;
    const canvas = this.estadoCanvasRef?.nativeElement;
    const estados = this.estados?.estados ?? [];
    if (!canvas || !this.hayPedidos) return;
    const texto = temaColor('--app-text-faint');
    this.estadoChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: estados.map(e => e.etiqueta),
        datasets: [{
          data: estados.map(e => e.pedidos),
          // Lo abierto (que pide acción) con el color de marca; lo terminado, atenuado.
          backgroundColor: estados.map(e => e.activo ? temaColor('--app-accent', 0.85) : temaColor('--app-text-faint', 0.45)),
          borderRadius: 4,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: texto, font: { size: 11 }, precision: 0 }, grid: { color: temaColor('--app-border') } },
          y: { ticks: { color: texto, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  get hayPedidos(): boolean {
    return (this.estados?.estados ?? []).some(e => e.pedidos > 0);
  }

  // ── Formato ────────────────────────────────────────────────────────────────
  peso(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  }

  private pesoCorto(n: number): string {
    return Math.abs(n) >= 1000 ? `$${(n / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k` : `$${n}`;
  }

  private recortar(texto: string, max: number): string {
    return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
  }
}
