import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ProductoService } from '../productos/service/producto.service';
import { CampanasService, ICampana, ICampanaProducto, IPersonaReporte, IReporteCampana } from './campanas.service';

interface IProductoCatalogo { id: number; nombre: string; precioVenta: number; stock: number; categoria: string | null; }

/**
 * Campañas (solo administrador): un evento con nombre y fechas; se eligen los juguetes y se le pone a cada uno su precio de campaña.
 * Esta pantalla solo CONFIGURA: el precio de campaña se aplica en Venta directa en la siguiente entrega. Una sola campaña encendida a la vez.
 * A diferencia de los grupos, un producto puede estar en varias campañas (Reyes, roscas…): solo una está encendida.
 * Todo el color sale de los tokens del diseño (Personalización), de día y de noche.
 */
@Component({
  selector: 'app-campanas',
  templateUrl: './campanas.component.html',
  styleUrls: ['./campanas.component.scss']
})
export class CampanasComponent implements OnInit, OnDestroy {

  campanas: ICampana[] = [];
  cargando = false;
  error: string | null = null;

  /** La campaña que se está creando o editando; null = solo la lista. */
  edicion: ICampana | null = null;
  guardando = false;

  readonly porPagina = 12;
  catalogo: IProductoCatalogo[] = [];
  pagina = 1;
  totalPaginas = 1;
  totalRegistros = 0;
  filtro = '';
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;
  private readonly buscador$ = new Subject<string>();
  private sub?: Subscription;

  constructor(private readonly svc: CampanasService, private readonly productos: ProductoService) {}

  ngOnInit(): void {
    this.cargar();
    this.sub = this.buscador$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.cargarCatalogo(1));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.listar().subscribe({
      next: c => { this.campanas = c; this.cargando = false; },
      error: e => { this.error = this.mensaje(e, 'No se pudieron cargar las campañas.'); this.cargando = false; }
    });
  }

  // ── Lista ──────────────────────────────────────────────────────────────────

  estado(c: ICampana): string {
    if (!c.activa) return 'Apagada';
    return c.vigente ? 'Vigente' : 'Encendida, fuera de fechas';
  }

  claseEstado(c: ICampana): string {
    return !c.activa ? 'cp-estado--apagada' : c.vigente ? 'cp-estado--ok' : 'cp-estado--fuera';
  }

  fechas(c: ICampana): string { return `${c.fechaInicio} → ${c.fechaFin}`; }

  private avisarError(titulo: string, e: unknown): void {
    Swal.fire({ icon: 'error', title: titulo, text: this.mensaje(e, 'Intenta de nuevo.') });
  }

  async alternar(c: ICampana): Promise<void> {
    if (!c.activa) {
      const otra = this.campanas.find(x => x.activa && x.id !== c.id);
      if (otra) {
        const r = await Swal.fire({
          icon: 'question', title: `¿Activar «${c.nombre}»?`,
          text: `Solo puede haber una campaña encendida: «${otra.nombre}» se apaga.`,
          showCancelButton: true, confirmButtonText: 'Sí, activar', cancelButtonText: 'No'
        });
        if (!r.isConfirmed) return;
      }
    }
    (c.activa ? this.svc.apagar(c.id!) : this.svc.activar(c.id!)).subscribe({
      next: () => this.cargar(),
      error: e => this.avisarError('No se pudo cambiar', e)
    });
  }

  duplicar(c: ICampana): void {
    this.svc.duplicar(c.id!).subscribe({ next: () => this.cargar(), error: e => this.avisarError('No se pudo duplicar', e) });
  }

  async eliminar(c: ICampana): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning', title: `¿Eliminar «${c.nombre}»?`,
      text: 'Sus juguetes vuelven a su precio normal. No se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No'
    });
    if (!r.isConfirmed) return;
    this.svc.eliminar(c.id!).subscribe({ next: () => this.cargar(), error: e => this.avisarError('No se pudo eliminar', e) });
  }

  // ── Reporte ────────────────────────────────────────────────────────────────
  /** El reporte abierto (quién lleva cuánto y quién ya llegó a la meta); null = cerrado. */
  reporte: IReporteCampana | null = null;
  cargandoReporte = false;

  verReporte(c: ICampana): void {
    this.cargandoReporte = true;
    this.svc.reporte(c.id!).subscribe({
      next: r => { this.reporte = r; this.cargandoReporte = false; },
      error: e => { this.cargandoReporte = false; this.avisarError('No se pudo cargar el reporte', e); }
    });
  }

  cerrarReporte(): void { this.reporte = null; }

  porIdDePersona(_: number, p: IPersonaReporte): number { return p.personaId; }

  async eliminarPersona(p: IPersonaReporte): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning', title: `¿Eliminar los datos de ${p.nombre || 'esta persona'}?`,
      text: 'Se borran su código, su nombre, correo y teléfono y lo que llevaba en las campañas. Sus pedidos no se tocan. No se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No'
    });
    if (!r.isConfirmed || !this.reporte) return;
    const id = this.reporte.campanaId;
    this.svc.eliminarPersona(p.personaId).subscribe({
      next: () => this.svc.reporte(id).subscribe(rep => this.reporte = rep),
      error: e => this.avisarError('No se pudo eliminar', e)
    });
  }

  // ── Formulario ─────────────────────────────────────────────────────────────

  nuevo(): void {
    this.edicion = { nombre: '', fechaInicio: null, fechaFin: null, metaMonto: 0, productos: [] };
    this.abrirCatalogo();
  }

  editar(c: ICampana): void {
    this.edicion = { ...c, productos: c.productos.map(p => ({ ...p })) };
    this.abrirCatalogo();
  }

  cancelar(): void { this.edicion = null; }

  get fechasAlReves(): boolean {
    const c = this.edicion;
    return !!c && !!c.fechaInicio && !!c.fechaFin && c.fechaInicio > c.fechaFin;
  }

  get puedeGuardar(): boolean {
    const c = this.edicion;
    return !!c && c.nombre.trim().length > 0 && !!c.fechaInicio && !!c.fechaFin && !this.fechasAlReves
      && (+c.metaMonto || 0) >= 0 && c.productos.length > 0 && c.productos.every(p => +p.precio > 0);
  }

  guardar(): void {
    const c = this.edicion;
    if (!c || !this.puedeGuardar) return;
    this.guardando = true;
    const peticion = c.id ? this.svc.actualizar(c.id, c) : this.svc.crear(c);
    peticion.subscribe({
      next: () => { this.guardando = false; this.edicion = null; this.cargar(); },
      error: e => { this.guardando = false; this.avisarError('No se pudo guardar', e); }
    });
  }

  // ── Juguetes de la campaña ─────────────────────────────────────────────────

  private abrirCatalogo(): void {
    this.filtro = '';
    this.cargarCatalogo(1);
  }

  alEscribir(texto: string): void {
    this.filtro = texto;
    this.buscador$.next(texto.trim());
  }

  cargarCatalogo(pagina: number): void {
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    // `todos`: el administrador ve también los productos sin stock o deshabilitados (un juguete puede estar agotado hoy y entrar a la campaña).
    this.productos.getDataNombreCodigoBarra(pagina, this.porPagina, this.filtro.trim(), true).subscribe({
      next: r => {
        this.catalogo = (r?.t ?? []).map(p => ({
          id: p.idProducto, nombre: p.nombre, precioVenta: p.precioVenta, stock: p.stock, categoria: p.palabraClave?.nombre ?? null
        }));
        this.pagina = r?.pagina ?? pagina;
        this.totalPaginas = Math.max(1, r?.totalPaginas ?? 1);
        this.totalRegistros = r?.totalRegistros ?? this.catalogo.length;
        this.cargandoCatalogo = false;
      },
      error: (e: HttpErrorResponse) => {
        this.catalogo = [];
        this.totalPaginas = 1;
        this.totalRegistros = 0;
        // El back responde 404 cuando el filtro no encuentra nada: no es un error para el usuario.
        this.errorCatalogo = e.status === 404 ? null : 'No se pudo cargar el catálogo.';
        this.cargandoCatalogo = false;
      }
    });
  }

  irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas && p !== this.pagina) this.cargarCatalogo(p);
  }

  estaAgregado(p: IProductoCatalogo): boolean {
    return !!this.edicion?.productos.some(x => x.productoId === p.id);
  }

  /** El precio de campaña empieza igual al normal; el administrador lo baja uno por uno. */
  agregarProducto(p: IProductoCatalogo): void {
    const c = this.edicion;
    if (!c || this.estaAgregado(p)) return;
    // Llega con el precio que ya tiene en su campaña más reciente (si nunca estuvo en una, con su precio de venta: el último que se puso al calcularlo).
    const previo = this.precioPrevio(p.id);
    c.productos = [...c.productos, { productoId: p.id, nombre: p.nombre, precio: previo ? previo.precio : p.precioVenta, origen: previo ? previo.campana : null }];
  }

  /** El último precio de campaña de un juguete en las OTRAS campañas (la más reciente primero por fecha de fin, luego por id); null si nunca estuvo en una. */
  private precioPrevio(productoId: number): { precio: number; campana: string } | null {
    const idEnEdicion = this.edicion?.id;
    const otras = this.campanas
      .filter(x => x.id !== idEnEdicion)
      .sort((a, b) => (b.fechaFin ?? '').localeCompare(a.fechaFin ?? '') || (b.id ?? 0) - (a.id ?? 0));
    for (const c of otras) {
      const p = c.productos.find(x => x.productoId === productoId);
      if (p && p.precio > 0) return { precio: +p.precio, campana: c.nombre };
    }
    return null;
  }

  /** Todos los de la página que se está viendo (por ejemplo, tras filtrar por «juguete»). */
  agregarPagina(): void {
    this.catalogo.forEach(p => this.agregarProducto(p));
  }

  get faltanDeLaPagina(): number { return this.catalogo.filter(p => !this.estaAgregado(p)).length; }

  porIdDeCatalogo(_: number, p: IProductoCatalogo): number { return p.id; }

  quitarProducto(p: ICampanaProducto): void {
    if (this.edicion) this.edicion.productos = this.edicion.productos.filter(x => x.productoId !== p.productoId);
  }

  porIdDeProducto(_: number, p: ICampanaProducto): number { return p.productoId; }

  private mensaje(e: unknown, defecto: string): string {
    return (e instanceof HttpErrorResponse ? e.error?.mensaje : null) || defecto;
  }
}
