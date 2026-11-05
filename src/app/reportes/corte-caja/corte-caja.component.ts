import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { LugarEntregaService } from '../../lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from '../../lugares-entrega/models/lugar-entrega.model';
import { CorteDeCaja, CorteFiltros, CortePedido, CorteZona, ReportesService } from '../service/reportes.service';

/**
 * Corte de caja (solo administrador): los pedidos por zona de entrega con lo que falta por cobrar. El corte NO se arma al abrir: se eligen
 * zonas, fechas, pago y entrega y se pulsa Buscar. Costo y ganancia van ocultos tras ojitos (por fila, por zona y total).
 * Todo en pantalla usa los tokens del diseño (Personalización), de día y de noche.
 */
@Component({
  selector: 'app-corte-caja',
  templateUrl: './corte-caja.component.html',
  styleUrls: ['./corte-caja.component.scss']
})
export class CorteCajaComponent implements OnInit {

  corte: CorteDeCaja | null = null;
  cargando = false;
  error: string | null = null;

  filtros: CorteFiltros = { zonas: [], desde: '', hasta: '', pago: 'POR_COBRAR', entrega: 'SIN_ENTREGAR' };
  zonasCatalogo: ILugarEntrega[] = [];
  /** El panel de filtros se pliega a un resumen después de buscar (sobre todo en el celular). */
  filtrosAbiertos = true;
  zonaBuscador = '';
  zonasAbiertas = false;
  /** Los filtros con los que se armó el corte que se ve en pantalla. */
  filtrosAplicados: string[] = [];
  copiado = false;

  readonly opcionesPorPagina = [10, 25, 50, 100];
  porPagina = 10;

  readonly pagos: { valor: CorteFiltros['pago']; etiqueta: string }[] = [
    { valor: 'POR_COBRAR', etiqueta: 'Por cobrar' }, { valor: 'PAGADOS', etiqueta: 'Pagados' }, { valor: 'TODOS', etiqueta: 'Todos' }];
  readonly entregas: { valor: CorteFiltros['entrega']; etiqueta: string }[] = [
    { valor: 'SIN_ENTREGAR', etiqueta: 'Sin entregar' }, { valor: 'ENTREGADOS', etiqueta: 'Entregados' }, { valor: 'TODOS', etiqueta: 'Todos' }];

  /** Filas (por número de pedido) con su costo y ganancia a la vista. */
  private readonly filasVisibles = new Set<number>();
  /** Zonas cuyo total de costo y ganancia está a la vista. */
  private readonly totalesDeZonaVisibles = new Set<string>();
  gananciaTotalVisible = false;
  private readonly paginaDeZona = new Map<string, number>();

  constructor(
    private readonly svc: ReportesService,
    private readonly lugares: LugarEntregaService,
    public readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.lugares.getAll().subscribe({
      next: z => this.zonasCatalogo = [...z].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      error: () => this.zonasCatalogo = []
    });
  }

  // ── Filtros ────────────────────────────────────────────────────────────────

  get zonasParaElegir(): { id: number; nombre: string }[] {
    const texto = this.zonaBuscador.trim().toLowerCase();
    return [...this.zonasCatalogo.map(z => ({ id: z.id, nombre: z.nombre })), { id: 0, nombre: 'Sin zona (se recoge en tienda)' }]
      .filter(z => !this.zonaMarcada(z.id) && (!texto || z.nombre.toLowerCase().includes(texto)));
  }

  get zonasElegidas(): { id: number; nombre: string }[] {
    return (this.filtros.zonas ?? []).map(id => ({
      id, nombre: id === 0 ? 'Sin zona' : (this.zonasCatalogo.find(z => z.id === id)?.nombre ?? `Zona ${id}`)
    }));
  }

  zonaMarcada(id: number): boolean { return (this.filtros.zonas ?? []).includes(id); }

  alternarZona(id: number): void {
    const zonas = this.filtros.zonas ?? [];
    this.filtros.zonas = zonas.includes(id) ? zonas.filter(z => z !== id) : [...zonas, id];
  }

  elegirZona(id: number): void {
    this.alternarZona(id);
    this.zonaBuscador = '';
  }

  /** Las etiquetas del resumen del panel de filtros cuando está plegado. */
  get resumenFiltros(): string[] {
    const r: string[] = [];
    const z = this.zonasElegidas.map(x => x.nombre);
    r.push(z.length ? (z.length > 2 ? `${z.slice(0, 2).join(', ')} +${z.length - 2}` : z.join(', ')) : 'Todas las zonas');
    r.push(this.pagos.find(p => p.valor === this.filtros.pago)?.etiqueta ?? '');
    r.push(this.entregas.find(e => e.valor === this.filtros.entrega)?.etiqueta ?? '');
    if (this.filtros.desde || this.filtros.hasta) r.push(`${this.filtros.desde || '…'} → ${this.filtros.hasta || '…'}`);
    return r.filter(x => !!x);
  }

  limpiar(): void {
    this.filtros = { zonas: [], desde: '', hasta: '', pago: 'POR_COBRAR', entrega: 'SIN_ENTREGAR' };
    this.corte = null;
    this.error = null;
    this.filtrosAbiertos = true;
  }

  /** Lo que quedó escrito en el buscador de zonas cuenta como elegido (si no, parecía que el filtro no hacía nada). */
  private tomarZonasEscritas(): void {
    if (!this.zonaBuscador.trim()) return;
    const ids = this.zonasParaElegir.map(z => z.id);
    if (ids.length) this.filtros.zonas = [...(this.filtros.zonas ?? []), ...ids];
    this.zonaBuscador = '';
  }

  /** Se cierra con un respiro: en el celular el campo pierde el foco antes de que el toque llegue a la opción. */
  cerrarListaDeZonas(): void {
    setTimeout(() => { this.zonasAbiertas = false; }, 250);
  }

  /** Lista nativa: funciona igual con mouse que con el dedo. */
  agregarDesdeSelect(ev: Event): void {
    const sel = ev.target as HTMLSelectElement;
    const id = Number(sel.value);
    if (sel.value !== '' && !Number.isNaN(id) && !this.zonaMarcada(id)) this.alternarZona(id);
    sel.value = '';
  }

  elegirPrimeraZona(): void {
    const primera = this.zonasParaElegir[0];
    if (primera) this.elegirZona(primera.id);
  }

  buscar(): void {
    this.tomarZonasEscritas();
    this.cargando = true;
    this.error = null;
    this.ocultarTodaLaGanancia();   // cada búsqueda nueva empieza con costo y ganancia ocultos
    this.paginaDeZona.clear();
    this.svc.getCorteDeCaja({
      ...this.filtros,
      zonas: [...(this.filtros.zonas ?? [])],
      desde: this.filtros.desde || undefined,
      hasta: this.filtros.hasta || undefined,
    }).subscribe({
      next: c => {
        this.corte = c;
        this.filtrosAplicados = this.resumenFiltros;
        this.cargando = false;
        if (window.innerWidth < 720) this.filtrosAbiertos = false;   // en el celular se ve primero el resultado
      },
      error: err => {
        this.cargando = false;
        this.error = err?.error?.mensaje ?? 'No se pudo armar el corte de caja. Intenta de nuevo.';
      }
    });
  }

  // ── Lectura de los pedidos ─────────────────────────────────────────────────

  /** «Sin pagos», «Anticipo $100.00» o «N pagos · $…». */
  textoPagos(p: CortePedido): string {
    if (p.pagos === 0) return 'Sin pagos';
    const monto = `$${p.pagado.toFixed(2)}`;
    return p.dioAnticipo ? `Anticipo ${monto}` : `${p.pagos} pagos · ${monto}`;
  }

  claseEstado(p: CortePedido): string {
    const e = (p.estado || '').toLowerCase();
    if (e.includes('pagad')) return 'cc-estado--ok';
    if (e.includes('apartad')) return 'cc-estado--info';
    if (e.includes('pendient')) return 'cc-estado--aviso';
    return 'cc-estado--neutro';
  }

  /** Cuánto de lo vendido ya se cobró (0 a 100). */
  get porcentajeCobrado(): number {
    const t = this.corte?.totalPedidos ?? 0;
    return t > 0 ? Math.min(100, Math.round(100 * (this.corte?.totalPagado ?? 0) / t)) : 0;
  }

  /** Cuánto de lo vendido en la zona ya se cobró (0 a 100). */
  porcentajeZona(z: CorteZona): number {
    return z.totalPedidos > 0 ? Math.min(100, Math.round(100 * z.totalPagado / z.totalPedidos)) : 0;
  }

  copiar(): void {
    if (!this.corte) return;
    const dinero = (n: number) => `$${n.toFixed(2)}`;
    const lineas: string[] = ['CORTE DE CAJA'];
    for (const z of this.corte.zonas) {
      lineas.push('', `${z.zona.toUpperCase()} (${z.cantidad} pedidos, ${z.articulos} artículos)`);
      for (const p of z.pedidos) {
        lineas.push(`#${p.pedidoId} ${p.cliente} · ${p.articulos} art. · total ${dinero(p.total)} · ${this.textoPagos(p)} · debe ${dinero(p.saldo)}`);
      }
      lineas.push(`Subtotal ${z.zona}: ${dinero(z.subtotal)}`);
    }
    lineas.push('', `TOTAL POR COBRAR: ${dinero(this.corte.total)}`);   // nunca lleva costo ni ganancia
    navigator.clipboard?.writeText(lineas.join('\n')).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 1500);
    }, () => undefined);
  }

  // ── Ojitos de costo y ganancia (solo administrador) ─────────────────────────
  private claveZona(z: { zonaId: number | null }): string { return String(z.zonaId ?? 0); }

  filaVisible(p: CortePedido): boolean { return this.filasVisibles.has(p.pedidoId); }

  alternarFila(p: CortePedido): void {
    if (this.filasVisibles.has(p.pedidoId)) this.filasVisibles.delete(p.pedidoId); else this.filasVisibles.add(p.pedidoId);
  }

  totalDeZonaVisible(z: { zonaId: number | null }): boolean { return this.totalesDeZonaVisibles.has(this.claveZona(z)); }

  alternarTotalDeZona(z: { zonaId: number | null }): void {
    const k = this.claveZona(z);
    if (this.totalesDeZonaVisibles.has(k)) this.totalesDeZonaVisibles.delete(k); else this.totalesDeZonaVisibles.add(k);
  }

  zonaTodaVisible(z: CorteZona): boolean {
    return this.totalDeZonaVisible(z) && z.pedidos.every(p => this.filaVisible(p));
  }

  alternarZonaTodo(z: CorteZona): void {
    if (this.zonaTodaVisible(z)) {
      z.pedidos.forEach(p => this.filasVisibles.delete(p.pedidoId));
      this.totalesDeZonaVisibles.delete(this.claveZona(z));
    } else {
      z.pedidos.forEach(p => this.filasVisibles.add(p.pedidoId));
      this.totalesDeZonaVisibles.add(this.claveZona(z));
    }
  }

  get todaLaGananciaVisible(): boolean {
    return !!this.corte && this.gananciaTotalVisible && this.corte.zonas.every(z => this.zonaTodaVisible(z));
  }

  alternarTodaLaGanancia(): void {
    if (!this.corte) return;
    if (this.todaLaGananciaVisible) {
      this.ocultarTodaLaGanancia();
    } else {
      this.corte.zonas.forEach(z => {
        z.pedidos.forEach(p => this.filasVisibles.add(p.pedidoId));
        this.totalesDeZonaVisibles.add(this.claveZona(z));
      });
      this.gananciaTotalVisible = true;
    }
  }

  private ocultarTodaLaGanancia(): void {
    this.filasVisibles.clear();
    this.totalesDeZonaVisibles.clear();
    this.gananciaTotalVisible = false;
  }

  // ── Paginación en pantalla (los totales NO dependen de la página) ───────────
  paginaActual(z: CorteZona): number {
    return Math.min(this.paginaDeZona.get(this.claveZona(z)) ?? 1, this.totalPaginas(z));
  }

  totalPaginas(z: CorteZona): number { return Math.max(1, Math.ceil(z.pedidos.length / this.porPagina)); }

  pedidosDePagina(z: CorteZona): CortePedido[] {
    const inicio = (this.paginaActual(z) - 1) * this.porPagina;
    return z.pedidos.slice(inicio, inicio + this.porPagina);
  }

  irAPagina(z: CorteZona, n: number): void {
    this.paginaDeZona.set(this.claveZona(z), Math.min(Math.max(1, n), this.totalPaginas(z)));
  }

  rangoDePagina(z: CorteZona): string {
    const inicio = (this.paginaActual(z) - 1) * this.porPagina;
    return `${z.pedidos.length ? inicio + 1 : 0}–${Math.min(inicio + this.porPagina, z.pedidos.length)} de ${z.pedidos.length}`;
  }

  cambiarPorPagina(n: number): void {
    this.porPagina = Number(n);
    this.paginaDeZona.clear();
  }

  trackZona(_: number, z: CorteZona): string { return String(z.zonaId ?? 0); }
  trackPedido(_: number, p: CortePedido): number { return p.pedidoId; }
}
