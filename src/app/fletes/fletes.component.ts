import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ProductoService } from '../productos/service/producto.service';
import { FletesService, IGastoViaje, IProductoViaje, IReporteViaje, IViaje } from './fletes.service';

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
  cargando = false;
  error: string | null = null;
  edicion: IViaje | null = null;
  guardando = false;
  errorGuardar: string | null = null;
  ocupadoId: number | null = null;

  // Buscador de productos para agregarlos al viaje
  texto = '';
  resultados: IProductoBuscado[] = [];
  buscando = false;
  private readonly buscador$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly svc: FletesService, private readonly productos: ProductoService) {}

  ngOnInit(): void {
    this.cargar();
    this.buscador$.pipe(
      debounceTime(350),
      switchMap(t => {
        if (t.trim().length < 2) { this.buscando = false; return of<IProductoBuscado[]>([]); }
        this.buscando = true;
        return this.productos.adminFiltrar({ nombreOCodigo: t.trim() }, 1, 8).pipe(
          map(r => (r?.t ?? []).map((p: any) => ({ id: p.idProducto, nombre: p.nombre, codigoBarras: p.codigoBarras ?? null, precioCosto: +(p.precioCosto ?? 0), stock: p.stock }))),
          catchError(() => of<IProductoBuscado[]>([])));
      }),
      takeUntil(this.destroy$)
    ).subscribe(r => { this.resultados = r; this.buscando = false; });
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

  alternarDetalle(v: IViaje): void { this.abiertoId = this.abiertoId === v.id ? null : (v.id ?? null); }

  nuevo(): void {
    this.errorGuardar = null;
    this.limpiarBuscador();
    this.edicion = { nombre: '', fecha: this.hoy(), fleteTotal: 0, nota: null, gastos: [], productos: [] };
  }

  editar(v: IViaje): void {
    this.errorGuardar = null;
    this.limpiarBuscador();
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
  quitarGasto(g: IGastoViaje): void { if (this.edicion) this.edicion.gastos = this.edicion.gastos.filter(x => x !== g); }

  alEscribir(t: string): void { this.texto = t; this.buscador$.next(t); }
  private limpiarBuscador(): void { this.texto = ''; this.resultados = []; }

  estaAgregado(p: IProductoBuscado): boolean { return !!this.edicion?.productos.some(x => x.productoId === p.id); }

  agregarProducto(p: IProductoBuscado): void {
    const e = this.edicion;
    if (!e || this.estaAgregado(p)) return;
    // Llega con 1 pieza, su costo de compra de hoy y el flete que sale de repartir el costo a cubrir entre todas las piezas (incluida esta).
    e.productos = [...e.productos, { productoId: p.id, nombre: p.nombre, codigoBarras: p.codigoBarras, piezas: 1, costoUnitario: p.precioCosto, fletePorPieza: 0 }];
    this.repartirPorIgual();
    this.limpiarBuscador();
  }

  quitarProducto(p: IProductoViaje): void { if (this.edicion) this.edicion.productos = this.edicion.productos.filter(x => x.productoId !== p.productoId); }

  /** Pone en TODOS los productos el flete por pieza = costo a cubrir ÷ piezas del viaje (después se puede cambiar uno por uno). */
  repartirPorIgual(): void {
    const e = this.edicion;
    if (!e || !this.piezasTotal) return;
    const por = Math.round((this.costoACubrir / this.piezasTotal) * 100) / 100;
    e.productos.forEach(p => p.fletePorPieza = por);
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
