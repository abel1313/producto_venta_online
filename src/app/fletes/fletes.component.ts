import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ProductoService } from '../productos/service/producto.service';
import { CampanasService, ICampana } from '../campanas/campanas.service';
import { FletesService, IGastoViaje, ILigaManual, ILineaSinViaje, IProductoViaje, IReporteViaje, IViaje } from './fletes.service';

interface IProductoBuscado { id: number; nombre: string; codigoBarras: string | null; precioCosto: number; stock: number; }

@Component({
  selector: 'app-fletes',
  templateUrl: './fletes.component.html',
  styleUrls: ['./fletes.component.scss']
})
export class FletesComponent implements OnInit, OnDestroy {
  viajes: IViaje[] = [];
  /** Cómo va cada viaje, por id (recuperado, falta, estado...). */
  reportes = new Map<number, IReporteViaje>();
  /** El viaje con su detalle de ventas abierto. */
  abiertoId: number | null = null;

  // ── Ligar ventas anteriores a un viaje ──
  /** El viaje al que se están ligando ventas anteriores (null = panel cerrado). */
  ligando: IViaje | null = null;
  ligarProductoId: number | null = null;
  ligarDesde = '';
  ligarHasta = '';
  lineasSinViaje: ILineaSinViaje[] = [];
  /** Piezas a ligar por línea de venta (detalleVentaId → cantidad); 0 o vacío = no se liga. */
  cantidades: Record<number, number> = {};
  /** Las ligas hechas a mano de este viaje, para poder deshacerlas. */
  ligasManuales: ILigaManual[] = [];
  deshaciendoId: number | null = null;
  buscandoVentas = false;
  guardandoLigas = false;
  errorLigar: string | null = null;
  avisoLigar: string | null = null;
  cargando = false;
  error: string | null = null;
  edicion: IViaje | null = null;
  guardando = false;
  errorGuardar: string | null = null;
  ocupadoId: number | null = null;
  /** El archivo que se está armando (id del viaje + formato), para no pedirlo dos veces ni dejar el botón libre. */
  descargando: string | null = null;
  errorDescarga: string | null = null;

  // Buscador de productos para agregarlos al viaje
  texto = '';
  resultados: IProductoBuscado[] = [];
  buscando = false;
  /** Categoría elegida para buscar: '' = todas, OTROS = productos sin categoría, o el nombre de una categoría. */
  readonly OTROS = '__OTROS__';
  categorias: string[] = [];
  categoria = '';
  pagina = 1;
  totalPaginas = 1;
  totalRegistros = 0;
  readonly porPagina = 12;
  /** Productos que entraron al viaje sin flete guardado y siguen en $0 (para marcarlos y llenarlos con «Llenar el flete que falta»). */
  private sinFleteIds = new Set<number>();
  agregandoCategoria = false;
  avisoCategoria: string | null = null;
  private readonly buscador$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly svc: FletesService, private readonly productos: ProductoService, private readonly campanasSvc: CampanasService) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarCampanas();
    this.productos.categoriasAdmin().pipe(catchError(() => of([] as string[])), takeUntil(this.destroy$)).subscribe(cs => this.categorias = cs);
    this.buscador$.pipe(
      debounceTime(350),
      switchMap(() => {
        const t = this.texto.trim();
        // Sin categoría elegida hace falta escribir al menos 2 letras; con categoría (u "Otros") se lista aunque no se escriba nada.
        if (!this.categoria && t.length < 2) { this.buscando = false; this.resultados = []; this.totalPaginas = 1; this.totalRegistros = 0; return of(null); }
        this.buscando = true;
        return this.productos.adminFiltrar(this.filtros(), this.pagina, this.porPagina).pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => {
      this.buscando = false;
      if (r === null) { if (this.categoria || this.texto.trim().length >= 2) { this.resultados = []; this.totalPaginas = 1; this.totalRegistros = 0; } return; }
      this.resultados = this.aBuscados(r?.t);
      this.totalPaginas = Math.max(1, r?.totalPaginas ?? 1);
      this.totalRegistros = r?.totalRegistros ?? this.resultados.length;
    });
  }

  private filtros(): { nombreOCodigo?: string; categoria?: string; sinCategoria?: boolean } {
    const t = this.texto.trim();
    return {
      nombreOCodigo: t.length >= 2 ? t : undefined,
      categoria: this.categoria && this.categoria !== this.OTROS ? this.categoria : undefined,
      sinCategoria: this.categoria === this.OTROS ? true : undefined
    };
  }

  private aBuscados(lista: any[] | undefined): IProductoBuscado[] {
    return (lista ?? []).map((p: any) => ({ id: p.idProducto, nombre: p.nombre, codigoBarras: p.codigoBarras ?? null, precioCosto: +(p.precioCosto ?? 0), stock: p.stock }));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Lista ──
  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.listar().subscribe({
      next: v => { this.viajes = v; this.cargando = false; this.cargarReportes(); },
      error: () => { this.cargando = false; this.error = 'No se pudieron cargar los viajes. Intenta de nuevo.'; }
    });
  }

  private cargarReportes(): void {
    this.svc.reportes().subscribe(l => { this.reportes = new Map(l.map(r => [r.viajeId, r] as [number, IReporteViaje])); });
  }

  reporteDe(v: IViaje): IReporteViaje | undefined { return v.id == null ? undefined : this.reportes.get(v.id); }

  /** Porcentaje del costo a cubrir que ya se recuperó con lo vendido (0 a 100). */
  porcentajeRecuperado(r: IReporteViaje | undefined): number {
    if (!r || !(r.costoACubrir > 0)) return 0;
    return Math.min(100, Math.round((r.fleteRecuperado / r.costoACubrir) * 100));
  }

  etiquetaEstado(e: IReporteViaje['estado']): string {
    return e === 'VENDIDO_POR_COMPLETO' ? 'Vendido por completo' : e === 'FLETE_CUBIERTO' ? 'Flete cubierto' : 'Abierto';
  }

  /** Baja el reporte del viaje en Excel o PDF. */
  descargar(v: IViaje, formato: 'XLSX' | 'PDF'): void {
    if (v.id == null || this.descargando) return;
    this.descargando = `${v.id}-${formato}`;
    this.errorDescarga = null;
    this.svc.descargarReporte(v.id, formato).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-viaje-${(v.nombre || 'viaje').replace(/[^\w\-]+/g, '-')}.${formato === 'PDF' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.descargando = null;
      },
      error: () => { this.descargando = null; this.errorDescarga = 'No se pudo armar el archivo del viaje. Intenta de nuevo.'; }
    });
  }

  alternarDetalle(v: IViaje): void { this.filtroDetalle = ''; this.abiertoId = this.abiertoId === v.id ? null : (v.id ?? null); }

  // ── Ligar ventas anteriores ──
  abrirLigar(v: IViaje): void {
    this.cancelar();
    this.ligando = v;
    this.ligarProductoId = v.productos.length === 1 ? v.productos[0].productoId : null;
    this.ligarDesde = ''; this.ligarHasta = '';
    this.lineasSinViaje = []; this.cantidades = {}; this.errorLigar = null; this.avisoLigar = null;
    this.cargarLigasManuales();
    if (this.ligarProductoId != null) this.buscarVentas();
  }

  private cargarLigasManuales(): void {
    const id = this.ligando?.id;
    if (id == null) { this.ligasManuales = []; return; }
    this.svc.ligasManuales(id).subscribe({ next: l => { if (this.ligando?.id === id) this.ligasManuales = l; }, error: () => { this.ligasManuales = []; } });
  }

  /** Deshace una liga hecha a mano: pide confirmación, las piezas vuelven a «sin viaje» y se refresca todo. */
  async deshacerLiga(l: ILigaManual): Promise<void> {
    if (this.deshaciendoId != null) return;
    const r = await Swal.fire({
      icon: 'question', title: '¿Deshacer esta liga?',
      text: `La venta #${l.ventaId} (${l.cantidad} pieza(s) de «${l.producto}») ya no contará como salida de este viaje: vuelve a «sin viaje» y su flete se estima como antes. La venta no cambia.`,
      showCancelButton: true, confirmButtonText: 'Sí, deshacer', cancelButtonText: 'No'
    });
    if (!r.isConfirmed) return;
    this.deshaciendoId = l.ligaId; this.errorLigar = null; this.avisoLigar = null;
    this.svc.quitarLiga(l.ligaId).subscribe({
      next: () => {
        this.deshaciendoId = null;
        this.avisoLigar = `Listo: se deshizo la liga de la venta #${l.ventaId}.`;
        this.cargarLigasManuales();
        this.cargarReportes();
        if (this.ligarProductoId != null) this.buscarVentas();
      },
      error: e => { this.deshaciendoId = null; this.errorLigar = this.mensaje(e, 'No se pudo deshacer la liga. Intenta de nuevo.'); }
    });
  }

  cerrarLigar(): void { this.ligando = null; this.ligasManuales = []; this.lineasSinViaje = []; this.cantidades = {}; this.errorLigar = null; this.avisoLigar = null; }

  alElegirProducto(id: number | null): void {
    this.ligarProductoId = id;
    this.lineasSinViaje = []; this.cantidades = {}; this.errorLigar = null; this.avisoLigar = null;
    if (id != null) this.buscarVentas();
  }

  buscarVentas(): void {
    if (this.ligarProductoId == null) return;
    this.buscandoVentas = true; this.errorLigar = null; this.avisoLigar = null;
    this.svc.lineasSinViaje(this.ligarProductoId, this.ligarDesde || undefined, this.ligarHasta || undefined).subscribe({
      next: l => { this.lineasSinViaje = l; this.cantidades = {}; this.buscandoVentas = false; },
      error: e => { this.buscandoVentas = false; this.errorLigar = this.mensaje(e, 'No se pudieron buscar las ventas.'); }
    });
  }

  /** Las piezas que le quedan por vender al producto elegido en este viaje (del reporte del viaje). */
  get restantesDelViaje(): number | null {
    const r = this.ligando ? this.reporteDe(this.ligando) : undefined;
    const p = r?.renglones.find(x => x.productoId === this.ligarProductoId);
    return p ? p.piezasRestantes : null;
  }

  get piezasAligar(): number {
    return this.lineasSinViaje.reduce((s, l) => s + (this.cantidadValida(l) ? +this.cantidades[l.detalleVentaId] : 0), 0);
  }

  cantidadValida(l: ILineaSinViaje): boolean {
    const c = +(this.cantidades[l.detalleVentaId] ?? 0);
    return Number.isInteger(c) && c >= 1 && c <= l.pendientes;
  }

  /** Lo que impide guardar, en palabras del dueño. */
  get motivosLigar(): string[] {
    const m: string[] = [];
    const pedidas = this.lineasSinViaje.filter(l => +(this.cantidades[l.detalleVentaId] ?? 0) !== 0);
    if (!pedidas.length) { m.push('Escribe cuántas piezas ligar en al menos una venta.'); return m; }
    if (pedidas.some(l => !this.cantidadValida(l))) m.push('Cada cantidad debe ser un número entero de 1 hasta las piezas pendientes de esa venta.');
    const restantes = this.restantesDelViaje;
    if (restantes != null && this.piezasAligar > restantes) m.push(`Este producto solo tiene ${restantes} pieza(s) por vender en este viaje y quieres ligar ${this.piezasAligar}.`);
    return m;
  }

  /** Llena las cantidades con todas las piezas pendientes, de la venta más vieja a la más nueva, sin pasar de lo que le queda al viaje. */
  llenarAutomatico(): void {
    let falta = this.restantesDelViaje ?? Number.MAX_SAFE_INTEGER;
    const c: Record<number, number> = {};
    for (const l of this.lineasSinViaje) {
      const toma = Math.min(l.pendientes, falta);
      if (toma > 0) { c[l.detalleVentaId] = toma; falta -= toma; }
    }
    this.cantidades = c;
  }

  guardarLigas(): void {
    if (!this.ligando?.id || this.ligarProductoId == null || this.guardandoLigas || this.motivosLigar.length) return;
    const ligas = this.lineasSinViaje.filter(l => this.cantidadValida(l)).map(l => ({ detalleVentaId: l.detalleVentaId, cantidad: +this.cantidades[l.detalleVentaId] }));
    this.guardandoLigas = true; this.errorLigar = null; this.avisoLigar = null;
    this.svc.ligarVentas(this.ligando.id, this.ligarProductoId, ligas).subscribe({
      next: n => {
        this.guardandoLigas = false;
        this.avisoLigar = `Listo: se ligaron ${n} pieza(s) a «${this.ligando?.nombre}».`;
        this.cargarReportes();
        this.cargarLigasManuales();
        this.buscarVentas();
      },
      error: e => { this.guardandoLigas = false; this.errorLigar = this.mensaje(e, 'No se pudo ligar. Intenta de nuevo.'); }
    });
  }

  porIdLinea(_: number, l: ILineaSinViaje): number { return l.detalleVentaId; }
  porIdLiga(_: number, l: ILigaManual): number { return l.ligaId; }

  nuevo(): void {
    this.errorGuardar = null;
    this.limpiarBuscador();
    this.sinFleteIds.clear();
    this.filtroViaje = ''; this.paginaViaje = 1;
    this.edicion = { nombre: '', fecha: this.hoy(), fleteTotal: 0, nota: null, gastos: [], productos: [] };
  }

  editar(v: IViaje): void {
    this.errorGuardar = null;
    this.limpiarBuscador();
    this.sinFleteIds.clear();
    this.filtroViaje = ''; this.paginaViaje = 1;
    this.edicion = { ...v, gastos: v.gastos.map(g => ({ ...g })), productos: v.productos.map(p => ({ ...p })) };
  }

  cancelar(): void { this.edicion = null; this.limpiarBuscador(); }

  async eliminar(v: IViaje): Promise<void> {
    if (v.id == null || this.ocupadoId != null) return;
    const r = await Swal.fire({
      icon: 'warning', title: `¿Eliminar «${v.nombre}»?`,
      text: 'Se borra el viaje con sus gastos y productos. No cambia el stock ni los precios de los productos.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    this.ocupadoId = v.id;
    this.svc.eliminar(v.id).subscribe({
      next: () => { this.ocupadoId = null; this.cargar(); },
      error: e => { this.ocupadoId = null; Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: this.mensaje(e, 'Intenta de nuevo.') }); }
    });
  }

  // ── Formulario ──
  agregarGasto(): void { this.edicion?.gastos.push({ concepto: '', monto: 0, cuentaParaCubrir: true }); }
  quitarGasto(g: IGastoViaje): void { if (this.edicion) { this.edicion.gastos = this.edicion.gastos.filter(x => x !== g); } }

  alEscribir(t: string): void { this.texto = t; this.pagina = 1; this.avisoCategoria = null; this.buscador$.next(); }
  alElegirCategoria(c: string): void { this.categoria = c; this.pagina = 1; this.avisoCategoria = null; this.buscador$.next(); }
  irAPagina(n: number): void { if (n < 1 || n > this.totalPaginas || n === this.pagina) return; this.pagina = n; this.buscador$.next(); }
  private limpiarBuscador(): void { this.texto = ''; this.categoria = ''; this.pagina = 1; this.totalPaginas = 1; this.totalRegistros = 0; this.resultados = []; this.avisoCategoria = null; }

  /** Productos de la búsqueda actual (categoría y/o texto) que todavía NO están en el viaje, de la lista que se ve en pantalla. */
  get pendientesDeLaPagina(): number { return this.resultados.filter(p => !this.estaAgregado(p)).length; }

  /**
   * Agrega TODOS los productos de la búsqueda actual (no solo los de la página que se ve): baja todas las páginas y los incorpora
   * (se salta los que ya están en el viaje: nunca duplica). Sirve para meter una categoría entera de una vez.
   */
  async agregarTodosDeLaBusqueda(): Promise<void> {
    if (!this.edicion || this.agregandoCategoria || this.totalRegistros === 0) return;
    this.agregandoCategoria = true; this.avisoCategoria = null;
    try {
      const ids: number[] = [];
      const tam = 100;
      let pag = 1, paginas = 1;
      do {
        const r: any = await this.productos.adminFiltrar(this.filtros(), pag, tam).toPromise();
        ids.push(...this.aBuscados(r?.t).map(p => p.id));
        paginas = Math.max(1, r?.totalPaginas ?? 1);
        pag++;
      } while (pag <= paginas && pag <= 50);
      this.avisoCategoria = await this.incorporar(ids);
    } catch {
      this.avisoCategoria = 'No se pudieron traer los productos. Intenta de nuevo.';
    } finally {
      this.agregandoCategoria = false;
    }
  }

  estaAgregado(p: IProductoBuscado): boolean { return !!this.edicion?.productos.some(x => x.productoId === p.id); }

  async agregarProducto(p: IProductoBuscado): Promise<void> {
    if (!this.edicion || this.estaAgregado(p)) return;
    this.avisoCategoria = await this.incorporar([p.id]);
    // Se conserva la búsqueda (categoría y página) para poder seguir agregando de la misma lista.
  }

  /**
   * Mete al viaje los productos pedidos que todavía no están (nunca duplica): cada uno llega con 1 pieza, su costo de compra de hoy y el flete por pieza
   * que YA tiene guardado en su último «Calcular precio». Los que no tienen flete guardado quedan en $0 con la marca «sin flete guardado»: después se
   * llenan con «Llenar el flete que falta» o se dejan en $0 (lo que se venda de ellos es ganancia). Devuelve el resumen para mostrar.
   */
  private async incorporar(ids: number[]): Promise<string> {
    const e = this.edicion;
    if (!e) return '';
    const nuevos = Array.from(new Set(ids)).filter(id => !e.productos.some(x => x.productoId === id));
    const yaEstaban = new Set(ids).size - nuevos.length;
    if (!nuevos.length) return yaEstaban ? `Los ${yaEstaban} producto(s) ya estaban en el viaje.` : 'No había productos que agregar.';
    const datos = await this.svc.productosParaViaje(nuevos).toPromise() ?? [];
    let conFlete = 0, sinFlete = 0;
    for (const d of datos) {
      if (!this.edicion || this.edicion.productos.some(x => x.productoId === d.productoId)) continue;
      const guardado = +d.transporte > 0;
      this.edicion.productos = [...this.edicion.productos, { productoId: d.productoId, nombre: d.nombre, codigoBarras: d.codigoBarras, piezas: 1, costoUnitario: +d.precioCosto || 0, fletePorPieza: guardado ? +d.transporte : 0 }];
      if (guardado) conFlete++; else { sinFlete++; this.sinFleteIds.add(d.productoId); }
    }
    const faltan = nuevos.length - datos.length;
    return `Se agregaron ${conFlete + sinFlete} producto(s): ${conFlete} con su flete guardado y ${sinFlete} sin flete guardado`
      + (yaEstaban ? `; se saltaron ${yaEstaban} que ya estaban` : '') + (faltan > 0 ? `; ${faltan} ya no existen` : '') + '. Ajusta las piezas de cada uno.';
  }

  quitarProducto(p: IProductoViaje): void {
    if (!this.edicion) return;
    this.edicion.productos = this.edicion.productos.filter(x => x.productoId !== p.productoId);
    this.sinFleteIds.delete(p.productoId);
  }

  /** Pone en TODOS los productos el flete por pieza = costo a cubrir ÷ piezas del viaje (después se puede cambiar uno por uno). */
  repartirPorIgual(): void {
    const e = this.edicion;
    if (!e || !this.piezasTotal) return;
    const por = Math.round((this.costoACubrir / this.piezasTotal) * 100) / 100;
    e.productos.forEach(p => p.fletePorPieza = por);
    this.sinFleteIds.clear();
  }

  /** Texto con el que se filtran los productos del detalle abierto de una card («Ver productos»). */
  filtroDetalle = '';

  /** Los renglones del detalle de un viaje que coinciden con el buscador de la card (todos si está vacío). */
  renglonesVisibles(r: IReporteViaje): IReporteViaje['renglones'] {
    const t = this.normalizar(this.filtroDetalle);
    if (!t) return r.renglones;
    return r.renglones.filter(p => this.normalizar(p.nombre ?? '').includes(t) || this.normalizar(p.codigoBarras ?? '').includes(t));
  }

  // ── Lista de productos del viaje: buscador, páginas y scroll (con 150+ productos pintar todo a la vez se traba) ──
  readonly porPaginaViaje = 25;
  filtroViaje = '';
  paginaViaje = 1;
  private cacheFuente: IProductoViaje[] | null = null;
  private cacheFiltro = '';
  private cacheLista: IProductoViaje[] = [];

  private normalizar(t: string): string {
    return (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /** Los productos del viaje que coinciden con el buscador (todos si está vacío). Se recalcula solo si cambió la lista o el texto. */
  get productosDelViaje(): IProductoViaje[] {
    const fuente = this.edicion?.productos ?? [];
    const t = this.normalizar(this.filtroViaje);
    if (this.cacheFuente === fuente && this.cacheFiltro === t) return this.cacheLista;
    this.cacheFuente = fuente; this.cacheFiltro = t;
    this.cacheLista = !t ? fuente : fuente.filter(p => this.normalizar(p.nombre ?? '').includes(t) || this.normalizar(p.codigoBarras ?? '').includes(t));
    return this.cacheLista;
  }

  get totalPaginasViaje(): number { return Math.max(1, Math.ceil(this.productosDelViaje.length / this.porPaginaViaje)); }
  /** La página que se ve: si se quitaron productos y la última página desapareció, se queda en la última que existe. */
  get paginaActualViaje(): number { return Math.min(Math.max(1, this.paginaViaje), this.totalPaginasViaje); }
  get productosDeLaPaginaViaje(): IProductoViaje[] {
    const i = (this.paginaActualViaje - 1) * this.porPaginaViaje;
    return this.productosDelViaje.slice(i, i + this.porPaginaViaje);
  }
  get rangoViaje(): string {
    const n = this.productosDelViaje.length;
    if (!n) return '0';
    const i = (this.paginaActualViaje - 1) * this.porPaginaViaje;
    return `${i + 1}–${Math.min(i + this.porPaginaViaje, n)} de ${n}`;
  }
  irAPaginaViaje(n: number): void { this.paginaViaje = Math.min(Math.max(1, n), this.totalPaginasViaje); }
  alEscribirFiltroViaje(t: string): void { this.filtroViaje = t; this.paginaViaje = 1; }

  // ── Productos sin flete guardado ──
  /** ¿Este renglón entró sin flete guardado y todavía está en $0 por llenar? */
  sinFleteGuardado(p: IProductoViaje): boolean { return this.sinFleteIds.has(p.productoId); }

  /** El dueño escribió el flete de un renglón: ya no está «sin flete guardado». */
  alEscribirFlete(p: IProductoViaje): void { this.sinFleteIds.delete(p.productoId); }

  get cuantosSinFlete(): number { return (this.edicion?.productos ?? []).filter(p => this.sinFleteIds.has(p.productoId)).length; }

  /** Lo que todavía falta por cubrir descontando el flete de los productos que sí lo traen (el que se repartiría entre los «sin flete guardado»). */
  get faltaParaLlenar(): number {
    const e = this.edicion;
    if (!e) return 0;
    const fijo = e.productos.filter(p => !this.sinFleteIds.has(p.productoId)).reduce((s, p) => s + (+p.piezas || 0) * (+p.fletePorPieza || 0), 0);
    return Math.max(0, this.costoACubrir - fijo);
  }

  /**
   * «Llenar el flete que falta»: reparte lo que todavía falta por cubrir solo entre los productos que entraron sin flete guardado, por pieza. Si no se
   * pulsa, esos productos se quedan en $0 y lo que se venda de ellos es ganancia. Los productos con flete guardado o escrito a mano no se tocan.
   */
  llenarFleteQueFalta(): void {
    const e = this.edicion;
    if (!e || !this.cuantosSinFlete) return;
    const sin = e.productos.filter(p => this.sinFleteIds.has(p.productoId));
    const piezas = sin.reduce((s, p) => s + (+p.piezas || 0), 0);
    if (piezas <= 0) return;
    const por = Math.round((this.faltaParaLlenar / piezas) * 100) / 100;
    sin.forEach(p => p.fletePorPieza = por);
    this.sinFleteIds.clear();
  }

  // ── Traer los productos de una campaña ──
  campanas: ICampana[] = [];
  campanaElegida: number | '' = '';
  importandoCampana = false;

  private cargarCampanas(): void {
    this.campanasSvc.listar().pipe(catchError(() => of([] as ICampana[])), takeUntil(this.destroy$)).subscribe(c => this.campanas = c.filter(x => x.productos?.length));
  }

  /** Mete al viaje todos los productos de la campaña elegida que todavía no estén (con su flete guardado), para no buscarlos uno por uno. */
  async importarCampana(): Promise<void> {
    const c = this.campanas.find(x => x.id === this.campanaElegida);
    if (!this.edicion || !c || this.importandoCampana) return;
    this.importandoCampana = true; this.avisoCategoria = null;
    try {
      this.avisoCategoria = await this.incorporar(c.productos.map(p => p.productoId));
    } catch {
      this.avisoCategoria = 'No se pudieron traer los productos de la campaña. Intenta de nuevo.';
    } finally {
      this.importandoCampana = false;
    }
  }

  // ── Cuentas en vivo (el back las vuelve a calcular al guardar) ──
  get costoACubrir(): number {
    const e = this.edicion;
    if (!e) return 0;
    return (+e.fleteTotal || 0) + e.gastos.filter(g => g.cuentaParaCubrir).reduce((s, g) => s + (+g.monto || 0), 0);
  }
  get piezasTotal(): number { return (this.edicion?.productos ?? []).reduce((s, p) => s + (+p.piezas || 0), 0); }
  get fleteAsignado(): number { return (this.edicion?.productos ?? []).reduce((s, p) => s + (+p.piezas || 0) * (+p.fletePorPieza || 0), 0); }
  get falta(): number { return Math.max(0, this.costoACubrir - this.fleteAsignado); }
  get sobra(): number { return Math.max(0, this.fleteAsignado - this.costoACubrir); }

  fleteRenglon(p: IProductoViaje): number { return (+p.piezas || 0) * (+p.fletePorPieza || 0); }

  /** Lo que impide guardar, en palabras del dueño. */
  get motivos(): string[] {
    const e = this.edicion;
    if (!e) return [];
    const m: string[] = [];
    if (!e.nombre.trim()) m.push('Falta el nombre del viaje.');
    if (!e.fecha) m.push('Falta la fecha de la compra.');
    if ((+e.fleteTotal || 0) < 0) m.push('El flete total no puede ser negativo.');
    if (e.gastos.some(g => !g.concepto.trim() || !(+g.monto > 0))) m.push('Cada gasto necesita su concepto y un monto mayor a cero (o quítalo).');
    if (e.productos.some(p => !(+p.piezas >= 1) || !Number.isInteger(+p.piezas))) m.push('Las piezas de cada producto deben ser un número entero de 1 o más.');
    if (e.productos.some(p => +p.costoUnitario < 0 || +p.fletePorPieza < 0)) m.push('El costo y el flete por pieza no pueden ser negativos.');
    return m;
  }

  guardar(): void {
    const e = this.edicion;
    if (!e || this.guardando || this.motivos.length) return;
    this.guardando = true;
    this.errorGuardar = null;
    const peticion = e.id != null ? this.svc.actualizar(e.id, e) : this.svc.crear(e);
    peticion.subscribe({
      next: () => { this.guardando = false; this.edicion = null; this.cargar(); },
      error: err => { this.guardando = false; this.errorGuardar = this.mensaje(err, 'No se pudo guardar el viaje.'); }
    });
  }

  evitarEnvioConEnter(ev: Event): void {
    if ((ev.target as HTMLElement)?.tagName !== 'TEXTAREA') ev.preventDefault();
  }

  porIdProducto(_: number, p: IProductoViaje): number { return p.productoId; }
  porIdViaje(_: number, v: IViaje): number { return v.id ?? 0; }

  private hoy(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private mensaje(e: unknown, defecto: string): string {
    const err = e as HttpErrorResponse;
    return err?.error?.mensaje || defecto;
  }
}
