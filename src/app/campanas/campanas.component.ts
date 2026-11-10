import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ProductoService } from '../productos/service/producto.service';
import { CampanasService, ICampana, ICampanaProducto, IPersonaReporte, IReporteCampana } from './campanas.service';

interface IProductoCatalogo { id: number; nombre: string; codigoBarras: string | null; precioVenta: number; precioRebaja: number; stock: number; categoria: string | null; }

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
  /** Cada carga del catálogo pasa por aquí: switchMap descarta la respuesta vieja si llega después de una más nueva (escribir rápido, cambiar de página). */
  private readonly pedirCatalogo$ = new Subject<{ pagina: number; filtro: string; categoria: string }>();
  /** Categorías para elegir los juguetes (solo JUGUETES, o todas). Se cargan una vez; si falla, el selector no se muestra y se ve todo el catálogo. */
  categorias: string[] = [];
  /** Categoría del catálogo: «JUGUETES» de entrada (si existe); '' = todas. */
  categoria = '';
  /** El texto con el que se pidió la última página del catálogo (para no repetir la misma búsqueda). */
  private filtroPedido = '';
  private readonly destroy$ = new Subject<void>();
  /** La campaña a la que se le está aplicando una acción (activar, apagar, duplicar, eliminar): evita el doble clic. */
  ocupadaId: number | null = null;

  /** Buscador de los juguetes que YA están en la campaña (por nombre o código de barras). Solo es una vista: no cambia la lista de la campaña. */
  filtroCampana = '';

  constructor(private readonly svc: CampanasService, private readonly productos: ProductoService) {}

  ngOnInit(): void {
    this.cargar();
    // Sin distinctUntilChanged: al abrir otra campaña el filtro vuelve a '' y escribir lo mismo que antes debe volver a buscar.
    // Se compara contra lo último que se PIDIÓ, no contra lo último que se escribió.
    this.buscador$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(t => { if (t !== this.filtroPedido) this.cargarCatalogo(1); });
    this.pedirCatalogo$.pipe(
      switchMap(({ pagina, filtro, categoria }) =>
        // adminFiltrar: nombre o código de barras + categoría; sin más filtros trae también los productos sin stock o deshabilitados (un juguete puede estar agotado hoy y entrar a la campaña).
        this.productos.adminFiltrar({ nombreOCodigo: filtro || undefined, categoria: categoria || undefined }, pagina, this.porPagina).pipe(
          map(r => ({ pagina, r, error: null as HttpErrorResponse | null })),
          catchError((e: HttpErrorResponse) => of({ pagina, r: null, error: e })))),
      takeUntil(this.destroy$)
    ).subscribe(({ pagina, r, error }) => {
      this.cargandoCatalogo = false;
      if (error) {
        this.catalogo = [];
        this.totalPaginas = 1;
        this.totalRegistros = 0;
        // El back responde 404 cuando el filtro no encuentra nada: no es un error para el usuario.
        this.errorCatalogo = error.status === 404 ? null : 'No se pudo cargar el catálogo.';
        return;
      }
      this.catalogo = (r?.t ?? []).map(p => ({
        id: p.idProducto, nombre: p.nombre, codigoBarras: p.codigoBarras ?? null, precioVenta: p.precioVenta, precioRebaja: +(p.precioRebaja ?? 0),
        stock: p.stock, categoria: p.palabraClave?.nombre ?? (this.categoria || null)
      }));
      this.pagina = r?.pagina ?? pagina;
      this.totalPaginas = Math.max(1, r?.totalPaginas ?? 1);
      this.totalRegistros = r?.totalRegistros ?? this.catalogo.length;
    });
    this.productos.categoriasAdmin().pipe(catchError(() => of([] as string[])), takeUntil(this.destroy$)).subscribe(cs => {
      this.categorias = cs;
      if (cs.includes('JUGUETES')) this.categoria = 'JUGUETES';
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private normalizar(t: string): string {
    return (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  alEscribirEnCampana(texto: string): void {
    this.filtroCampana = texto;
  }

  limpiarFiltroCampana(): void {
    this.filtroCampana = '';
  }

  /** Los juguetes de la campaña que se ven: todos si no hay texto; si hay, los que coinciden en nombre o que el buscador del catálogo halló por nombre/código de barras. */
  get productosFiltrados(): ICampanaProducto[] {
    const lista = this.edicion?.productos ?? [];
    const t = this.normalizar(this.filtroCampana);
    if (!t) return lista;
    return lista.filter(p => this.normalizar(p.nombre ?? '').includes(t) || this.normalizar(p.codigoBarras ?? '').includes(t));
  }

  /** Qué decir cuando el texto no coincide con ningún juguete de la campaña. */
  get mensajeSinCoincidencias(): string {
    return 'Ningún juguete de la campaña coincide con lo que escribiste.';
  }

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

  fechas(c: ICampana): string { return `${this.fechaLegible(c.fechaInicio)} → ${this.fechaLegible(c.fechaFin)}`; }

  private static readonly MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /**
   * «2027-01-05» → «5 ene 2027» SIN pasar por Date: `new Date('2027-01-05')` es medianoche UTC y en México (UTC-6) se pintaría el 4 de enero.
   * Las fechas de la campaña son días (LocalDate del back), no instantes.
   */
  fechaLegible(f: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f ?? '');
    if (!m) return f ?? '—';
    return `${+m[3]} ${CampanasComponent.MESES[+m[2] - 1] ?? m[2]} ${m[1]}`;
  }

  private avisarError(titulo: string, e: unknown): void {
    Swal.fire({ icon: 'error', titleText: titulo, text: this.mensaje(e, 'Intenta de nuevo.') });
  }

  /**
   * Aviso INFORMATIVO (no bloquea; regla 2026-11-10): las fechas de esta campaña se enciman con las de otra. Se calcula con la lista que ya se tiene
   * (fechas «AAAA-MM-DD»: se comparan como texto). Solo con texto plano (titleText), nunca html.
   */
  private avisarSiSeEncima(c: Pick<ICampana, 'id' | 'fechaInicio' | 'fechaFin'>): void {
    const ini = c.fechaInicio, fin = c.fechaFin;
    if (!ini || !fin) return;
    const otras = this.campanas.filter(x => x.id !== c.id && !!x.fechaInicio && !!x.fechaFin && ini <= x.fechaFin! && x.fechaInicio! <= fin);
    if (!otras.length) return;
    const lista = otras.slice(0, 3).map(x => `«${x.nombre}» (${this.fechas(x)})`).join(', ') + (otras.length > 3 ? '…' : '');
    Swal.fire({
      toast: true, position: 'top-end', icon: 'info', titleText: `Esta campaña se encima con ${lista}`,
      showConfirmButton: false, showCloseButton: true, timer: 8000, timerProgressBar: true
    });
  }

  async alternar(c: ICampana): Promise<void> {
    if (c.activa && c.vigente) {
      // Apagar una campaña vigente corta los descuentos en Venta directa desde ese momento: se confirma (regla 2026-11-10).
      const r = await Swal.fire({
        icon: 'warning', titleText: `¿Apagar «${c.nombre}»?`,
        text: 'Está vigente: al apagarla se cortan los descuentos de campaña en las ventas desde este momento (las ventas ya hechas no cambian).',
        showCancelButton: true, confirmButtonText: 'Sí, apagar', cancelButtonText: 'No', reverseButtons: true
      });
      if (!r.isConfirmed) return;
    }
    if (!c.activa) {
      const otra = this.campanas.find(x => x.activa && x.id !== c.id);
      if (otra) {
        const r = await Swal.fire({
          icon: 'question', titleText: `¿Activar «${c.nombre}»?`,
          text: `Solo puede haber una campaña encendida: «${otra.nombre}» se apaga.`,
          showCancelButton: true, confirmButtonText: 'Sí, activar', cancelButtonText: 'No'
        });
        if (!r.isConfirmed) return;
      }
    }
    if (this.ocupadaId !== null) return;
    this.ocupadaId = c.id!;
    const activando = !c.activa;
    (c.activa ? this.svc.apagar(c.id!) : this.svc.activar(c.id!)).subscribe({
      next: () => { this.ocupadaId = null; if (activando) this.avisarSiSeEncima(c); this.cargar(); },
      error: e => { this.ocupadaId = null; this.avisarError('No se pudo cambiar', e); }
    });
  }

  duplicar(c: ICampana): void {
    if (this.ocupadaId !== null) return;
    this.ocupadaId = c.id!;
    this.svc.duplicar(c.id!).subscribe({
      next: () => { this.ocupadaId = null; this.cargar(); },
      error: e => { this.ocupadaId = null; this.avisarError('No se pudo duplicar', e); }
    });
  }

  async eliminar(c: ICampana): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning', titleText: `¿Eliminar «${c.nombre}»?`,
      text: 'Sus juguetes vuelven a su precio normal. No se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No'
    });
    if (!r.isConfirmed || this.ocupadaId !== null) return;
    this.ocupadaId = c.id!;
    this.svc.eliminar(c.id!).subscribe({
      next: () => {
        this.ocupadaId = null;
        // Si su reporte estaba abierto, ya no existe: se cierra para no dejar datos de una campaña borrada.
        if (this.reporte?.campanaId === c.id) this.reporte = null;
        this.cargar();
      },
      error: e => {
        this.ocupadaId = null;
        if (e instanceof HttpErrorResponse && e.status === 409) { this.avisarNoSeElimina(c, e); return; }
        this.avisarError('No se pudo eliminar', e);
      }
    });
  }

  /**
   * El back ya no borra una campaña con compras ligadas (409): se muestra SU mensaje y se indica apagarla para conservar el historial. Si sigue
   * encendida se ofrece apagarla ahí mismo. Texto plano (titleText/text), nunca html.
   */
  private async avisarNoSeElimina(c: ICampana, e: HttpErrorResponse): Promise<void> {
    const delBack = this.mensaje(e, 'Esta campaña ya tiene compras ligadas.');
    const texto = /ap[aá]gala/i.test(delBack) ? delBack : `${delBack} Apágala para conservar el historial.`;
    const r = await Swal.fire({
      icon: 'info', titleText: `«${c.nombre}» no se puede eliminar`, text: texto,
      showCancelButton: !!c.activa, confirmButtonText: c.activa ? 'Apagarla' : 'Entendido', cancelButtonText: 'Cerrar', reverseButtons: true
    });
    if (r.isConfirmed && c.activa) this.alternar(c);
  }

  // ── Reporte ────────────────────────────────────────────────────────────────
  /** El reporte abierto (quién lleva cuánto y quién ya llegó a la meta); null = cerrado. */
  reporte: IReporteCampana | null = null;
  cargandoReporte = false;
  /** Fechas de la campaña del reporte abierto (lo pagado entre ellas es lo que cuenta para la meta). */
  fechasReporte = '';
  /** Persona cuyos datos se están borrando (evita el doble clic). */
  borrandoPersonaId: number | null = null;

  verReporte(c: ICampana): void {
    this.cargandoReporte = true;
    this.svc.reporte(c.id!).subscribe({
      next: r => { this.reporte = r; this.fechasReporte = this.fechas(c); this.cargandoReporte = false; },
      error: e => { this.cargandoReporte = false; this.avisarError('No se pudo cargar el reporte', e); }
    });
  }

  cerrarReporte(): void { this.reporte = null; }

  porIdDePersona(_: number, p: IPersonaReporte): number { return p.personaId; }

  async eliminarPersona(p: IPersonaReporte): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning', titleText: `¿Eliminar los datos de ${p.nombre || 'esta persona'}?`,
      text: 'Se borran su código, su nombre, correo y teléfono y lo que llevaba en las campañas. Sus pedidos no se tocan. No se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No'
    });
    if (!r.isConfirmed || !this.reporte || this.borrandoPersonaId !== null) return;
    const id = this.reporte.campanaId;
    this.borrandoPersonaId = p.personaId;
    this.svc.eliminarPersona(p.personaId).subscribe({
      next: () => {
        this.borrandoPersonaId = null;
        // Se quita de la tabla al momento y luego se vuelven a pedir los totales; si el refresco falla, se avisa (la persona ya se borró).
        if (this.reporte?.campanaId === id) this.reporte = { ...this.reporte, personas: this.reporte.personas.filter(x => x.personaId !== p.personaId) };
        this.svc.reporte(id).subscribe({
          next: rep => { if (this.reporte?.campanaId === id) this.reporte = rep; },
          error: e => this.avisarError('Se borraron los datos, pero no se pudo actualizar el reporte', e)
        });
      },
      error: e => { this.borrandoPersonaId = null; this.avisarError('No se pudo eliminar', e); }
    });
  }

  // ── Formulario ─────────────────────────────────────────────────────────────

  nuevo(): void {
    this.reporte = null;
    this.limpiarFiltroCampana();
    this.edicion = { nombre: '', fechaInicio: null, fechaFin: null, metaMonto: 0, productos: [] };
    this.abrirCatalogo();
  }

  editar(c: ICampana): void {
    this.reporte = null;
    this.limpiarFiltroCampana();
    this.edicion = { ...c, productos: c.productos.map(p => ({ ...p })) };
    this.abrirCatalogo();
  }

  cancelar(): void { this.limpiarFiltroCampana(); this.edicion = null; }

  get fechasAlReves(): boolean {
    const c = this.edicion;
    return !!c && !!c.fechaInicio && !!c.fechaFin && c.fechaInicio > c.fechaFin;
  }

  /**
   * ¿El precio de campaña sirve? Mayor a 0 YA redondeado a centavos (el back guarda 2 decimales: 0.004 pasaría «> 0» y quedaría en $0.00).
   * Vacío, negativo, 0 o algo que no es número: no.
   */
  precioValido(p: ICampanaProducto): boolean {
    const v = p.precio as unknown;
    if (v === null || v === undefined || v === '') return false;
    const n = Number(v);
    return isFinite(n) && Math.round(n * 100) / 100 > 0;
  }

  get metaValida(): boolean {
    const v = this.edicion?.metaMonto as unknown;
    if (v === null || v === undefined || v === '') return true;   // vacío = 0 = sin meta
    const n = Number(v);
    return isFinite(n) && n >= 0;
  }

  /** Juguetes de la campaña sin un precio válido (pueden estar ocultos por el buscador de la lista). */
  get sinPrecioValido(): ICampanaProducto[] { return (this.edicion?.productos ?? []).filter(p => !this.precioValido(p)); }

  /** Por qué no se puede guardar todavía, en palabras del dueño (el botón deshabilitado solo no lo dice). */
  get motivosParaNoGuardar(): string[] {
    const c = this.edicion;
    if (!c) return [];
    const m: string[] = [];
    if (!c.nombre.trim()) m.push('Ponle un nombre.');
    if (!c.fechaInicio || !c.fechaFin) m.push('Elige la fecha de inicio y la de fin.');
    if (!this.metaValida) m.push('La meta no puede ser negativa.');
    if (!c.productos.length) m.push('Agrega al menos un juguete desde el catálogo.');
    const malos = this.sinPrecioValido;
    if (malos.length) {
      const nombres = malos.slice(0, 3).map(p => `«${p.nombre || 'Producto ' + p.productoId}»`).join(', ');
      m.push(`${malos.length === 1 ? 'Un juguete no tiene' : malos.length + ' juguetes no tienen'} precio de campaña mayor a $0: ${nombres}${malos.length > 3 ? '…' : ''}`
        + (this.filtroCampana.trim() ? ' (puede estar oculto por el buscador).' : '.'));
    }
    return m;
  }

  get puedeGuardar(): boolean {
    const c = this.edicion;
    return !!c && !this.fechasAlReves && this.motivosParaNoGuardar.length === 0;
  }

  /** Enter dentro del formulario NO guarda la campaña (el buscador del catálogo, un lector de código de barras o un precio lo mandan): solo el botón. */
  evitarEnvioConEnter(ev: Event): void {
    const t = ev.target as HTMLElement | null;
    if (t && t.tagName === 'INPUT') ev.preventDefault();
  }

  guardar(): void {
    const c = this.edicion;
    // `guardando`: el botón se deshabilita, pero ngSubmit también llega por otras vías; sin esto salían dos POST y se creaban dos campañas.
    if (!c || !this.puedeGuardar || this.guardando) return;
    this.guardando = true;
    const peticion = c.id ? this.svc.actualizar(c.id, c) : this.svc.crear(c);
    peticion.subscribe({
      next: guardada => { this.guardando = false; this.edicion = null; this.avisarSiSeEncima({ ...c, id: guardada?.id ?? c.id }); this.cargar(); },
      error: e => { this.guardando = false; this.avisarError('No se pudo guardar', e); }
    });
  }

  // ── Juguetes de la campaña ─────────────────────────────────────────────────

  private abrirCatalogo(): void {
    this.filtro = '';
    this.catalogo = [];
    this.cargarCatalogo(1);
  }

  /** Cambió la categoría del catálogo: vuelve a la página 1 con ese filtro. */
  alCambiarCategoria(c: string): void {
    this.categoria = c;
    this.cargarCatalogo(1);
  }

  alEscribir(texto: string): void {
    this.filtro = texto;
    this.buscador$.next(texto.trim());
  }

  cargarCatalogo(pagina: number): void {
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    this.filtroPedido = this.filtro.trim();
    this.pedirCatalogo$.next({ pagina, filtro: this.filtroPedido, categoria: this.categoria });
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
    // Llega con el precio de DESCUENTO que ya tiene el producto (su «Precio con descuento»); si no tiene, el de su campaña más reciente; si tampoco,
    // el precio de venta. Sin ninguno llega vacío (no en 0): así se ve que falta ponerlo. Siempre se puede cambiar.
    const previo = this.precioPrevio(p.id);
    let precio: number; let origen: string | null;
    if (p.precioRebaja > 0) { precio = p.precioRebaja; origen = 'precio con descuento del producto'; }
    else if (previo) { precio = previo.precio; origen = `precio de «${previo.campana}»`; }
    else { precio = p.precioVenta > 0 ? p.precioVenta : (null as unknown as number); origen = null; }
    c.productos = [...c.productos, { productoId: p.id, nombre: p.nombre, codigoBarras: p.codigoBarras, precio, origen }];
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
