import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../../shared/barcode-scanner.util';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IFiltrosDisponibles, IVarianteResumen } from '../models/variante.model';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { VarianteService } from '../service/variante.service';
import { CompartirService } from 'src/app/shared/compartir.service';
import { PromocionService } from 'src/app/promociones/service/promocion.service';
import { FavoritoService } from 'src/app/favoritos/service/favorito.service';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.scss']
})
export class BuscarComponent implements OnInit, OnDestroy {

  @ViewChild('videoScanner') videoScanner!: ElementRef<HTMLVideoElement>;

  variantes: IVarianteResumen[] = [];
  paginaActual    = 1;
  totalPaginas    = 0;
  terminoBusqueda = '';
  buscando        = false;
  isAdminUser     = false;
  sinResultados   = false;
  // Cada checkbox es independiente (no excluyente entre si). Si ambos de un par estan marcados
  // (o ninguno), no se filtra por esa dimension (se traen ambos casos) — solo cuando queda
  // marcado exactamente uno de los dos se manda el booleano al back.
  mostrarConStock = false;
  mostrarSinStock = false;
  mostrarConImagenes = false;
  mostrarSinImagenes = false;
  mostrarHabilitados = false;
  mostrarNoHabilitados = false;
  mostrarCodigoGenerado = false;
  mostrarCodigoReal = false;
  // Rango de fecha de creacion — inputs de fecha, no checkboxes tri-estado (2026-08-24).
  fechaDesde = '';
  fechaHasta = '';

  // Filtros públicos del catálogo (talla/color/marca/precio) — visibles para cualquier usuario,
  // combinables entre sí con AND. Independientes de los filtros admin de arriba (endpoints
  // distintos en el back, no se combinan entre ellos).
  filtrosDisponibles: IFiltrosDisponibles | null = null;
  filtroTalla = '';
  filtroColor = '';
  filtroMarca = '';
  filtroPrecioMin: number | null = null;
  filtroPrecioMax: number | null = null;

  detalle: IDetalleVariante[] = [];
  escaneando       = false;
  seleccionados    = new Set<number>();
  procesandoLote   = false;
  private controlesEscaner: IScannerControls | null = null;

  private productoId = 0;
  get modoPorProducto(): boolean { return this.productoId > 0; }
  private reqId             = 0;
  private busquedaSubject = new Subject<string>();
  private destroy$        = new Subject<void>();

  hayPromos = false;

  // Favoritos — solo usuarios logueados (con perfil de cliente completo, lo valida el back)
  private roles: string[] = [];
  get isAnonymous(): boolean { return !this.roles || this.roles.length === 0; }
  favoritosIds = new Set<number>();
  /** Se apaga si el back dice que al usuario le falta perfil de cliente — ver `ngOnInit`. */
  favoritosDisponibles = true;

  constructor(
    private readonly varianteService: VarianteService,
    private readonly authService: AuthService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly route: ActivatedRoute,
    readonly router: Router,
    private readonly compartirSvc: CompartirService,
    private readonly promoService: PromocionService,
    private readonly favoritoService: FavoritoService
  ) {}

  compartirImagen(v: IVarianteResumen): void {
    if (!v.imagenUrl) return;
    this.compartirSvc.compartirImagen({
      titulo:    [v.nombreProducto, v.talla, v.color].filter(Boolean).join(' · '),
      precio:    v.precio ?? 0,
      imagenUrl: v.imagenUrl
    });
  }

  ngOnInit(): void {
    this.promoService.getActivas(1, 1).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.hayPromos = (res?.data?.totalRegistros ?? 0) > 0; },
      error: () => { this.hayPromos = false; }
    });

    this.authService.userRoles$.pipe(takeUntil(this.destroy$)).subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
      if (!this.isAnonymous) {
        this.favoritoService.listarIds().pipe(takeUntil(this.destroy$)).subscribe({
          next: res => { this.favoritosIds = new Set(res?.data ?? []); this.favoritosDisponibles = true; },
          error: err => {
            this.favoritosIds = new Set();
            // Si el back dice que le falta perfil de cliente, favoritos no le sirve de nada:
            // se esconde el corazón en vez de dejarle un botón que solo puede darle error.
            // Cualquier otro fallo (red, etc.) NO lo esconde — puede ser pasajero.
            const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
            if (msg.toLowerCase().includes('perfil de cliente')) this.favoritosDisponibles = false;
          }
        });
      }
    });

    this.carritoVariante.carrito$.pipe(takeUntil(this.destroy$)).subscribe(d => { this.detalle = d; });

    this.varianteService.filtrosDisponibles().pipe(takeUntil(this.destroy$)).subscribe({
      next: f => { this.filtrosDisponibles = f; },
      error: () => { this.filtrosDisponibles = null; }
    });

    this.busquedaSubject.pipe(debounceTime(1500), takeUntil(this.destroy$))
      .subscribe((termino: string) => {
        if (this.hayFiltrosAdminActivos) {
          this.aplicarFiltrosAdmin(1);
        } else if (this.hayFiltrosPublicosActivos) {
          this.aplicarFiltrosPublicos(1);
        } else {
          this.buscarPagina(termino, 1);
        }
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.productoId = Number(params['productoId']) || 0;
      if (this.productoId > 0) {
        this.cargarResumen(1);
      } else {
        if (this.varianteService.initialized) {
          this.terminoBusqueda = this.varianteService.terminoCache;
          this.variantes       = [...this.varianteService.variantesCache];
          this.totalPaginas    = this.varianteService.totalPaginasCache;
          this.paginaActual    = this.varianteService.paginaCache;
          // Restaura los filtros que produjeron este resultado cacheado -- sin esto, la lista
          // volvía filtrada pero los checkboxes se veían todos apagados (2026-09-02: "si
          // selecciono filtro y me voy a otros lados... quiero que se mantenga").
          const f = this.varianteService.filtrosCache as Record<string, any> | null;
          if (f) {
            this.mostrarConStock      = !!f['mostrarConStock'];
            this.mostrarSinStock      = !!f['mostrarSinStock'];
            this.mostrarConImagenes   = !!f['mostrarConImagenes'];
            this.mostrarSinImagenes   = !!f['mostrarSinImagenes'];
            this.mostrarHabilitados   = !!f['mostrarHabilitados'];
            this.mostrarNoHabilitados = !!f['mostrarNoHabilitados'];
            this.mostrarCodigoGenerado = !!f['mostrarCodigoGenerado'];
            this.mostrarCodigoReal    = !!f['mostrarCodigoReal'];
            this.fechaDesde = f['fechaDesde'] ?? '';
            this.fechaHasta = f['fechaHasta'] ?? '';
            this.filtroTalla = f['filtroTalla'] ?? '';
            this.filtroColor = f['filtroColor'] ?? '';
            this.filtroMarca = f['filtroMarca'] ?? '';
            this.filtroPrecioMin = f['filtroPrecioMin'] ?? null;
            this.filtroPrecioMax = f['filtroPrecioMax'] ?? null;
          }
        } else {
          this.buscarPagina('', 1);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Búsqueda ───────────────────────────────────────────────────────

  onBuscar(event: KeyboardEvent): void {
    const valor = (event.target as HTMLInputElement).value;
    this.terminoBusqueda = valor;
    const termino = valor.trim();
    const hayFiltros = this.hayFiltrosAdminActivos || this.hayFiltrosPublicosActivos;
    if (termino.length === 0 && !hayFiltros) { this.buscarPagina('', 1); return; }
    if (termino.length > 0 && termino.length < 3 && !hayFiltros) return;
    this.busquedaSubject.next(termino);
  }

  private buscarPagina(termino: string, pagina: number): void {
    if (
      this.varianteService.initialized &&
      this.varianteService.terminoCache === termino &&
      this.varianteService.paginaCache  === pagina
    ) return;

    this.buscando = true;
    const id = ++this.reqId;
    const params = { termino, pagina, size: 10 };

    this.varianteService.buscar(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        if (this.reqId !== id) return;
        this.sinResultados = false;
        this.variantes    = res.t ?? [];
        this.totalPaginas = res.totalPaginas;
        this.paginaActual = pagina;
        this.varianteService.setCache(res.t ?? [], pagina, res.totalPaginas, termino);
        this.buscando = false;
      },
      error: (err) => {
        if (this.reqId !== id) return;
        this.buscando = false;
        if (err.status === 404) {
          this.variantes    = [];
          this.totalPaginas = 0;
          this.sinResultados = true;
          this.varianteService.setCache([], pagina, 0, termino);
        }
      }
    });
  }

  get hayFiltrosAdminActivos(): boolean {
    return this.mostrarConStock || this.mostrarSinStock
        || this.mostrarConImagenes || this.mostrarSinImagenes
        || this.mostrarHabilitados || this.mostrarNoHabilitados
        || this.mostrarCodigoGenerado || this.mostrarCodigoReal
        || !!this.fechaDesde || !!this.fechaHasta;
  }

  // Barra de filtros de Tienda -- antes dependía solo de isAdminUser (todo o nada). Se sumó al
  // sistema de acciones por pantalla (2026-08-28, mismo cambio que en Modelos) para poder darle
  // a un rol, por ejemplo, solo "Con stock" sin el resto -- ver migration_filtros_granulares.sql.
  get puedeFiltroConStock(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-con-stock');
  }

  get puedeFiltroSinStock(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-sin-stock');
  }

  get puedeFiltroConImagenes(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-con-imagenes');
  }

  get puedeFiltroSinImagenes(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-sin-imagenes');
  }

  get puedeFiltroHabilitados(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-habilitados');
  }

  get puedeFiltroNoHabilitados(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-no-habilitados');
  }

  get puedeFiltroCodigoGenerado(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-codigo-generado');
  }

  get puedeFiltroCodigoReal(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-codigo-real');
  }

  get puedeFiltroFecha(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'filtro-fecha-creacion');
  }

  get puedeVerAlgunFiltro(): boolean {
    return this.puedeFiltroConStock || this.puedeFiltroSinStock
        || this.puedeFiltroConImagenes || this.puedeFiltroSinImagenes
        || this.puedeFiltroHabilitados || this.puedeFiltroNoHabilitados
        || this.puedeFiltroCodigoGenerado || this.puedeFiltroCodigoReal
        || this.puedeFiltroFecha;
  }

  // Acciones de Fase 3 extendidas a "tienda/buscar" (2026-09-04) -- ver
  // migration_accion_tienda_habilitar_compartir.sql. "habilitar" tiene back real
  // (accion("tienda/buscar", "habilitar") en SecurityConfig); "compartir-imagen" es solo
  // frontend, CompartirService no llama ningún endpoint propio.
  get puedeHabilitar(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'habilitar');
  }

  get puedeCompartirImagen(): boolean {
    return this.authService.tieneAccion('tienda/buscar', 'compartir-imagen');
  }

  // Ambos marcados o ninguno de un par = no se filtra por esa dimension (se traen los dos casos).
  private get paramConStock(): boolean | undefined {
    return this.mostrarConStock === this.mostrarSinStock ? undefined : this.mostrarConStock;
  }
  private get paramConImagenes(): boolean | undefined {
    return this.mostrarConImagenes === this.mostrarSinImagenes ? undefined : this.mostrarConImagenes;
  }
  private get paramHabilitado(): boolean | undefined {
    return this.mostrarHabilitados === this.mostrarNoHabilitados ? undefined : this.mostrarHabilitados;
  }
  private get paramCodigoGenerado(): boolean | undefined {
    return this.mostrarCodigoGenerado === this.mostrarCodigoReal ? undefined : this.mostrarCodigoGenerado;
  }

  toggleFiltroAdmin(campo: 'mostrarConStock' | 'mostrarSinStock' | 'mostrarConImagenes'
      | 'mostrarSinImagenes' | 'mostrarHabilitados' | 'mostrarNoHabilitados'
      | 'mostrarCodigoGenerado' | 'mostrarCodigoReal'): void {
    if (!this.puedeVerAlgunFiltro) return;
    this[campo] = !this[campo];
    this.seleccionados.clear();
    this.aplicarFiltrosAdmin(1);
  }

  // Rango de fecha — se dispara con (change) del <input type="date">, no con toggleFiltroAdmin
  // (ese es solo para los pares booleanos tri-estado).
  onFechaFiltroChange(): void {
    if (!this.puedeVerAlgunFiltro) return;
    this.seleccionados.clear();
    this.aplicarFiltrosAdmin(1);
  }

  limpiarFiltrosAdmin(): void {
    this.mostrarConStock = false;
    this.mostrarSinStock = false;
    this.mostrarConImagenes = false;
    this.mostrarSinImagenes = false;
    this.mostrarHabilitados = false;
    this.mostrarNoHabilitados = false;
    this.mostrarCodigoGenerado = false;
    this.mostrarCodigoReal = false;
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.seleccionados.clear();
    this.varianteService.invalidarCache();
    this.varianteService.setFiltrosCache(null);
    this.buscarPagina(this.terminoBusqueda, 1);
  }

  private aplicarFiltrosAdmin(pagina: number): void {
    this.buscando = true;
    this.varianteService.invalidarCache();
    this.varianteService.adminFiltrar({
      nombreOCodigo: this.terminoBusqueda || undefined,
      conStock: this.paramConStock,
      conImagenes: this.paramConImagenes,
      habilitado: this.paramHabilitado,
      codigoGenerado: this.paramCodigoGenerado,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined
    }, pagina, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.sinResultados = false;
        this.variantes    = res.t ?? [];
        this.totalPaginas = res.totalPaginas;
        this.paginaActual = pagina;
        this.buscando = false;
        this.varianteService.setCache(res.t ?? [], pagina, res.totalPaginas, this.terminoBusqueda);
        this.varianteService.setFiltrosCache({
          mostrarConStock: this.mostrarConStock,
          mostrarSinStock: this.mostrarSinStock,
          mostrarConImagenes: this.mostrarConImagenes,
          mostrarSinImagenes: this.mostrarSinImagenes,
          mostrarHabilitados: this.mostrarHabilitados,
          mostrarNoHabilitados: this.mostrarNoHabilitados,
          mostrarCodigoGenerado: this.mostrarCodigoGenerado,
          mostrarCodigoReal: this.mostrarCodigoReal,
          fechaDesde: this.fechaDesde,
          fechaHasta: this.fechaHasta
        });
      },
      error: (err) => {
        this.buscando = false;
        if (err.status === 404) { this.variantes = []; this.totalPaginas = 0; this.sinResultados = true; }
        else Swal.fire({ icon: 'error', title: 'Error al filtrar', text: err?.error?.mensaje ?? 'No se pudo aplicar el filtro.' });
      }
    });
  }

  // ── Filtros públicos del catálogo (talla / color / marca / precio) ───

  get hayFiltrosPublicosActivos(): boolean {
    return !!this.filtroTalla || !!this.filtroColor || !!this.filtroMarca
        || this.filtroPrecioMin !== null || this.filtroPrecioMax !== null;
  }

  onFiltroPublicoChange(): void {
    this.seleccionados.clear();
    this.aplicarFiltrosPublicos(1);
  }

  limpiarFiltrosPublicos(): void {
    this.filtroTalla = '';
    this.filtroColor = '';
    this.filtroMarca = '';
    this.filtroPrecioMin = null;
    this.filtroPrecioMax = null;
    this.varianteService.invalidarCache();
    this.varianteService.setFiltrosCache(null);
    this.buscarPagina(this.terminoBusqueda, 1);
  }

  private aplicarFiltrosPublicos(pagina: number): void {
    this.buscando = true;
    this.varianteService.invalidarCache();
    this.varianteService.buscarFiltrado({
      termino: this.terminoBusqueda.trim() || undefined,
      precioMin: this.filtroPrecioMin ?? undefined,
      precioMax: this.filtroPrecioMax ?? undefined,
      talla: this.filtroTalla || undefined,
      color: this.filtroColor || undefined,
      marca: this.filtroMarca || undefined,
    }, pagina, 10).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.sinResultados = (res.t ?? []).length === 0;
        this.variantes    = res.t ?? [];
        this.totalPaginas = res.totalPaginas;
        this.paginaActual = pagina;
        this.buscando = false;
        this.varianteService.setCache(res.t ?? [], pagina, res.totalPaginas, this.terminoBusqueda);
        this.varianteService.setFiltrosCache({
          filtroTalla: this.filtroTalla,
          filtroColor: this.filtroColor,
          filtroMarca: this.filtroMarca,
          filtroPrecioMin: this.filtroPrecioMin,
          filtroPrecioMax: this.filtroPrecioMax
        });
      },
      error: (err) => {
        this.buscando = false;
        Swal.fire({ icon: 'error', title: 'Error al filtrar', text: err?.error?.mensaje ?? 'No se pudo aplicar el filtro.' });
      }
    });
  }

  private cargarResumen(pagina: number): void {
    this.buscando = true;
    this.varianteService.getPorProductoPaginadoResumen(this.productoId, pagina, 10)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: res => {
          this.variantes    = res.t ?? [];
          this.totalPaginas = res.totalPaginas;
          this.paginaActual = pagina;
          this.buscando = false;
        },
        error: () => { this.buscando = false; }
      });
  }

  // ── Paginación ─────────────────────────────────────────────────────

  anteriorPagina(): void {
    if (this.paginaActual <= 1) return;
    const p = this.paginaActual - 1;
    this.seleccionados.clear();
    if (this.productoId > 0) this.cargarResumen(p);
    else if (this.hayFiltrosAdminActivos) this.aplicarFiltrosAdmin(p);
    else if (this.hayFiltrosPublicosActivos) this.aplicarFiltrosPublicos(p);
    else this.buscarPagina(this.terminoBusqueda, p);
  }

  siguientePagina(): void {
    if (this.paginaActual >= this.totalPaginas) return;
    const p = this.paginaActual + 1;
    this.seleccionados.clear();
    if (this.productoId > 0) this.cargarResumen(p);
    else if (this.hayFiltrosAdminActivos) this.aplicarFiltrosAdmin(p);
    else if (this.hayFiltrosPublicosActivos) this.aplicarFiltrosPublicos(p);
    else this.buscarPagina(this.terminoBusqueda, p);
  }

  // ── Carrito variante ───────────────────────────────────────────────

  agregarCarrito(v: IVarianteResumen): void {
    const ok = this.carritoVariante.agregar(v);
    if (!ok) {
      Swal.fire({
        icon: 'warning', title: 'Sin stock',
        text: `No hay más unidades disponibles.`,
        confirmButtonColor: '#3085d6', timer: 2000, showConfirmButton: false
      });
    }
  }

  eliminarCarrito(v: IVarianteResumen): void {
    this.carritoVariante.eliminar(v.id);
  }

  // ── Favoritos ──────────────────────────────────────────────────────

  esFavorito(v: IVarianteResumen): boolean {
    return this.favoritosIds.has(v.id);
  }

  toggleFavorito(v: IVarianteResumen): void {
    if (this.isAnonymous) return;
    const eraFavorito = this.favoritosIds.has(v.id);
    // Optimista: refleja el cambio de inmediato, revierte solo si el back falla.
    if (eraFavorito) this.favoritosIds.delete(v.id);
    else this.favoritosIds.add(v.id);

    const obs = eraFavorito ? this.favoritoService.quitar(v.id) : this.favoritoService.agregar(v.id);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      error: err => {
        if (eraFavorito) this.favoritosIds.add(v.id);
        else this.favoritosIds.delete(v.id);
        const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
        // Red de seguridad: si el corazón alcanzó a mostrarse (la carga inicial no falló, pero
        // el perfil sigue incompleto), no se le deja un error muerto — se le ofrece la salida.
        if (msg.toLowerCase().includes('perfil de cliente')) {
          this.favoritosDisponibles = false;
          Swal.fire({
            icon: 'info',
            title: 'Falta completar tus datos',
            text: 'Para guardar favoritos necesitamos tu nombre, apellido y teléfono.',
            showCancelButton: true,
            confirmButtonText: 'Completar mis datos',
            cancelButtonText: 'Ahora no'
          }).then(r => { if (r.isConfirmed) this.router.navigate(['/clientes/agregar']); });
          return;
        }
        Swal.fire({ icon: 'error', title: 'Error', text: msg || 'No se pudo actualizar favoritos.' });
      }
    });
  }

  verCarrito(): void {
    this.router.navigate(['/tienda/carrito']);
  }

  // Se manda el `productoId` que ya viene en el resumen para que la ficha no tenga que pedirlo
  // con `getOne`, que es ADMIN-only desde 2026-08-11 y le daría 403 a un cliente.
  irDetalle(v: IVarianteResumen): void {
    this.router.navigate(['/tienda/detalle', v.id], {
      queryParams: v.productoId ? { productoId: v.productoId } : {}
    });
  }

  editarVariante(v: IVarianteResumen): void {
    this.varianteService.getOne(v.id).subscribe({
      next: variante => {
        this.varianteService.setVarianteUpdate(variante);
        this.router.navigate(['/tienda/update']);
      },
      error: () => {
        // Si falla, navega con los datos que tenemos
        this.varianteService.setVarianteUpdate({ id: v.id, talla: v.talla, color: v.color,
          marca: v.marca, presentacion: v.presentacion, stock: v.stock, descripcion: v.descripcion,
          contenidoNeto: v.contenidoNeto } as any);
        this.router.navigate(['/tienda/update']);
      }
    });
  }

  estaEnCarrito(v: IVarianteResumen): boolean {
    return this.carritoVariante.estaEnCarrito(v.id);
  }

  cantidadEnCarrito(v: IVarianteResumen): number {
    return this.carritoVariante.cantidadEnCarrito(v.id);
  }

  // Stock real menos lo que ya está en el carrito — así el número que ve el usuario baja
  // conforme agrega, en vez de quedarse fijo mientras el botón ya está deshabilitado.
  stockDisponible(v: IVarianteResumen): number {
    return Math.max(0, (v.stock ?? 0) - this.cantidadEnCarrito(v));
  }

  stockAgotado(v: IVarianteResumen): boolean {
    const stock = v.stock ?? 0;
    return stock === 0 || this.cantidadEnCarrito(v) >= stock;
  }

  get totalEnCarrito(): number {
    return this.carritoVariante.total;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  colorHeader(color: string): string {
    const map: Record<string, string> = {
      negro:    'linear-gradient(135deg,#424242,#616161)',
      azul:     'linear-gradient(135deg,#1e88e5,#42a5f5)',
      rojo:     'linear-gradient(135deg,#e53935,#ef5350)',
      blanco:   'linear-gradient(135deg,#78909c,#90a4ae)',
      verde:    'linear-gradient(135deg,#43a047,#66bb6a)',
      amarillo: 'linear-gradient(135deg,#fb8c00,#ffa726)',
      gris:     'linear-gradient(135deg,#546e7a,#78909c)',
      rosa:     'linear-gradient(135deg,#e91e63,#f06292)',
      morado:   'linear-gradient(135deg,#7b1fa2,#ab47bc)',
      naranja:  'linear-gradient(135deg,#f4511e,#ff7043)',
      cafe:     'linear-gradient(135deg,#6d4c41,#8d6e63)',
      beige:    'linear-gradient(135deg,#8d6e63,#a1887f)',
      turquesa: 'linear-gradient(135deg,#00897b,#26a69a)',
      celeste:  'linear-gradient(135deg,#039be5,#29b6f6)',
    };
    return map[(color ?? '').toLowerCase().trim()]
      ?? 'linear-gradient(135deg,#5c6bc0,#7986cb)';
  }

  stockClase(stock: number): string {
    if (stock === 0) return 'badge bg-danger';
    if (stock <= 3)  return 'badge bg-warning text-dark';
    return 'badge bg-success';
  }

  // ── Escáner de código de barras ────────────────────────────────────

  async iniciarEscaner(): Promise<void> {
    this.escaneando = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      this.controlesEscaner = await iniciarEscanerConAutofoco(
        this.videoScanner.nativeElement,
        (result, _err, controls) => {
          if (result) {
            const codigo = result.getText();
            this.terminoBusqueda = codigo;
            if (this.hayFiltrosAdminActivos) {
              this.aplicarFiltrosAdmin(1);
            } else if (this.hayFiltrosPublicosActivos) {
              this.aplicarFiltrosPublicos(1);
            } else {
              this.buscarPagina(codigo, 1);
            }
            controls.stop();
            this.escaneando = false;
          }
        }
      );
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo acceder a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.' });
      this.escaneando = false;
    }
  }

  detenerEscaner(): void {
    this.controlesEscaner?.stop();
    this.controlesEscaner = null;
    this.escaneando = false;
  }

  // ── Habilitar / Deshabilitar ───────────────────────────────────────

  estaHabilitado(v: IVarianteResumen): boolean {
    return v.habilitado !== '0';
  }

  toggleSeleccion(id: number): void {
    if (this.seleccionados.has(id)) {
      this.seleccionados.delete(id);
    } else {
      this.seleccionados.add(id);
    }
  }

  get todoSeleccionado(): boolean {
    return this.variantes.length > 0 && this.variantes.every(v => this.seleccionados.has(v.id));
  }

  toggleTodos(): void {
    if (this.todoSeleccionado) {
      this.variantes.forEach(v => this.seleccionados.delete(v.id));
    } else {
      this.variantes.forEach(v => this.seleccionados.add(v.id));
    }
  }

  habilitarVariante(v: IVarianteResumen, habilitar: boolean): void {
    this.varianteService.habilitarVariante(v.id, habilitar).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        v.habilitado = habilitar ? '1' : '0';
        Swal.fire({ icon: 'success', title: habilitar ? 'Variante habilitada' : 'Variante deshabilitada', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cambiar el estado.' })
    });
  }

  habilitarLote(habilitar: boolean): void {
    if (this.seleccionados.size === 0 || this.procesandoLote) return;
    const ids = Array.from(this.seleccionados);
    this.procesandoLote = true;
    this.varianteService.habilitarLote(ids, habilitar).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.variantes.forEach(v => {
          if (this.seleccionados.has(v.id)) v.habilitado = habilitar ? '1' : '0';
        });
        this.seleccionados.clear();
        this.procesandoLote = false;
        Swal.fire({ icon: 'success', title: habilitar ? 'Variantes habilitadas' : 'Variantes deshabilitadas', timer: 1800, showConfirmButton: false });
      },
      error: (err) => {
        this.procesandoLote = false;
        Swal.fire({ icon: 'error', title: 'Error en lote', text: err?.error?.mensaje ?? 'No se pudo procesar el lote.' });
      }
    });
  }

}
