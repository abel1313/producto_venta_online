import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PedidosService } from '../pedidos.service';
import { IPedidoGenerico } from './models/IPedidoGenerico.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { AuthService } from 'src/app/auth/auth.service';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPageable } from './models/IPageable.mode';
import { PagoService } from '../pago.service';
import { IOpcionMesesDto, IOpcionPagoDto, ITerminalIniciarRequest } from './models/IPago.model';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import { generarHtmlTicket, imprimirTicket, ITicketData } from 'src/app/shared/ticket.util';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import { motivoCancelacionSwalFragment, MOTIVOS_CANCELACION } from 'src/app/shared/motivo-cancelacion.util';
import { LugarEntregaService } from 'src/app/lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from 'src/app/lugares-entrega/models/lugar-entrega.model';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { FloresService } from 'src/app/flores/service/flores.service';
import { GrupoPedidoService } from '../grupo-pedido.service';
import { GrupoEnLista } from '../models/grupo-pedido.model';
import { PreferenciaFiltroService } from 'src/app/shared/preferencia-filtro.service';
import {
  filtrosPedidosVacios, IFiltrosPedidos, IOpcionFiltro, IPedidosEncontrados,
  OPCIONES_DINERO, OPCIONES_ENTREGA, OPCIONES_ESTADO, OPCIONES_FORMA, OPCIONES_MODO, OPCIONES_ORDEN, OPCIONES_UNIDOS
} from './models/filtros-pedidos.model';

/** Los cuatro formularios de cobro a crédito de la card (carpeta ../cobro). */
type FormaCobroCredito = 'liquidar' | 'abonar' | 'liquidar-grupo' | 'abonar-grupo';
/** Bloques del panel ⚙️ Filtros con una sola acción de Gestión de roles para todo el bloque. */
type AccionFiltroBloque = 'filtro-dinero' | 'filtro-fecha-entrega' | 'filtro-lugar'
  | 'filtro-unidos-otros' | 'filtro-registrado' | 'filtro-total';

// Leaflet calcula la URL de sus íconos por defecto en base a dónde quedó su propio bundle, y
// con Angular/webpack casi siempre la resuelve mal — el pin del mapa sale invisible, sin
// ningún error en consola. Fix estándar: apuntar a copias propias en assets/leaflet en vez de
// depender de esa resolución automática. Corre una sola vez al cargar el módulo.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png',
});

// Tejupilco, Edo. México — centro por defecto del mapa cuando el pedido todavía no tiene
// ubicación guardada. Es el mismo punto que el back usó de ejemplo en su documentación, y
// corresponde a la zona real donde el negocio entrega.
const CENTRO_MAPA_DEFAULT: L.LatLngTuple = [18.916234, -100.143567];

@Component({
  selector: 'app-mis-pedidos',
  templateUrl: './mis-pedidos.component.html',
  styleUrls: ['./mis-pedidos.component.scss']
})
export class MisPedidosComponent implements OnInit, OnDestroy {
  roles: string[] = [];
  isAdminUser: boolean = false;
  buscarProd: string = '';
  mostrarDetalle: boolean = false;
  pedidoGenerico: IPedidoGenerico[] = [];
  resposeGenericPedido: ResponseGeneric<IPageable<IPedidoGenerico[]>> = {
    code: 0,
    data: { list: [], totalPaginas: 0 },
    lista: [],
    mensaje: ''
  };
  idUsuario: number = 0;
  clienteId: number = 0;
  /** El usuario no tiene perfil de cliente — sin eso no hay pedidos que mostrarle. */
  sinPerfilCliente = false;

  // --- Diálogo de cobro ---
  mostrarDialogoCobro: boolean = false;
  pedidoACobrar: IPedidoGenerico | null = null;

  opcionesEstructuradas: IOpcionPagoDto[] = [];
  tipoPagoActivo: IOpcionPagoDto | null = null;
  mesesSeleccionado: IOpcionMesesDto | null = null;
  pagosYMesesId: number | null = null;

  // Terminal Mercado Pago
  estadoTerminal: 'idle' | 'procesando' | 'aprobado' | 'rechazado' | 'cancelado' | 'bloqueado' = 'idle';
  errorTerminal: string | null = null;
  intentId: string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  imprimiendoTicket: { [id: number]: boolean } = {};
  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;
  private qrInstagram: string | null = null;
  private qrTiktok: string | null = null;

  // ── Filtro por lugar de entrega (autocomplete, solo admin) ──────────────
  lugares: ILugarEntrega[] = [];
  terminoLugar = '';
  lugaresFiltrados: ILugarEntrega[] = [];
  mostrarDropdownLugar = false;

  get lugarFiltroId(): number | null {
    return this.filtros.lugarEntregaId;
  }

  // ── Filtros de la lista del administrador (GET /v1/pedidos/buscar, 2026-10-06) ──────────
  // Reglas R1–R13 en el back: hexagonal/busquedapedido/README.md. Filtros distintos se combinan
  // con Y; las opciones de un mismo filtro, con O. Se guardan por persona (preferenciafiltro,
  // pantalla 'pedidos-mis-pedidos'); el texto buscado y la página no se guardan.
  filtros: IFiltrosPedidos = filtrosPedidosVacios();
  readonly opcionesForma   = OPCIONES_FORMA;
  readonly opcionesEstado  = OPCIONES_ESTADO;
  readonly opcionesDinero  = OPCIONES_DINERO;
  readonly opcionesEntrega = OPCIONES_ENTREGA;
  readonly opcionesModo    = OPCIONES_MODO;
  readonly opcionesUnidos  = OPCIONES_UNIDOS;
  readonly opcionesOrden   = OPCIONES_ORDEN;

  /** Total de pedidos que cumplen los filtros (todas las páginas). */
  totalRegistros = 0;
  /** "Escribe al menos 3 letras…": el texto corto no sale al back (regla de buscadores). */
  avisoBusqueda: string | null = null;

  /** Los filtros ocupan media pantalla en celular: arrancan cerrados y cada navegador recuerda. */
  filtrosAbiertos = MisPedidosComponent.leerFiltrosAbiertos();

  private static leerFiltrosAbiertos(): boolean {
    try { return localStorage.getItem('mis-pedidos:filtros-abiertos') === '1'; } catch { return false; }
  }

  alternarFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    try { localStorage.setItem('mis-pedidos:filtros-abiertos', this.filtrosAbiertos ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }

  /** Cada opción del panel pide su acción de Gestión de roles (Mis pedidos → Filtros). */
  puedeVerOpcion(o: IOpcionFiltro<unknown>): boolean {
    return !o.accion || this.puedeFiltro(o.accion);
  }

  /** Un bloque completo del panel (Dinero, Fecha de entrega, Dónde se entrega...). */
  puedeFiltro(accion: AccionFiltroBloque | string): boolean {
    return this.authService.tieneAccion('pedidos/mis-pedidos', accion);
  }

  /** Forma de cobro y Estado van opción por opción: el bloque se esconde si no queda ninguna. */
  algunaVisible(opciones: IOpcionFiltro<unknown>[]): boolean {
    return opciones.some(o => this.puedeVerOpcion(o));
  }

  estaMarcado(lista: 'formas' | 'estados' | 'dinero', valor: string): boolean {
    return (this.filtros[lista] as string[]).includes(valor);
  }

  /** Filtros de varias opciones (O entre ellas): prende o apaga una. */
  alternar(lista: 'formas' | 'estados' | 'dinero', valor: string): void {
    const actual = this.filtros[lista] as string[];
    (this.filtros as any)[lista] = actual.includes(valor) ? actual.filter(v => v !== valor) : [...actual, valor];
    this.alCambiarFiltros();
  }

  /** Filtros de una sola opción: tocar la que ya está la quita. */
  elegirUno(campo: 'entrega' | 'modoEntrega' | 'unidos', valor: string): void {
    (this.filtros as any)[campo] = this.filtros[campo] === valor ? null : valor;
    this.alCambiarFiltros();
  }

  alternarOtro(campo: 'soloRamos' | 'soloConPromocion'): void {
    this.filtros[campo] = !this.filtros[campo];
    this.alCambiarFiltros();
  }

  /** Total y fechas: se aplican al salir del campo o con Enter, no con cada tecla. */
  alCambiarRango(): void {
    const f = this.filtros;
    if (f.totalDesde != null && f.totalHasta != null && f.totalDesde > f.totalHasta) {
      Swal.fire({ icon: 'info', title: 'Revisa el total', text: 'El total "desde" es mayor que el "hasta".' });
      return;
    }
    if (f.registroDesde && f.registroHasta && f.registroDesde > f.registroHasta) {
      Swal.fire({ icon: 'info', title: 'Revisa las fechas', text: 'La fecha "desde" va después de la fecha "hasta".' });
      return;
    }
    this.alCambiarFiltros();
  }

  alCambiarFiltros(): void {
    this.guardarFiltros();
    this.buscarPedidoAdmin();
  }

  quitarFiltros(): void {
    this.filtros = filtrosPedidosVacios();
    this.terminoLugar = '';
    this.preferenciaFiltro.borrar('pedidos-mis-pedidos');
    this.buscarPedidoAdmin();
  }

  /** Cuántos filtros hay puestos, para verlo aunque el panel esté cerrado. El orden no cuenta. */
  get filtrosActivos(): number {
    const f = this.filtros;
    return f.formas.length + f.estados.length + f.dinero.length
      + (f.totalDesde != null ? 1 : 0) + (f.totalHasta != null ? 1 : 0)
      + (f.registroDesde ? 1 : 0) + (f.registroHasta ? 1 : 0)
      + (f.entrega ? 1 : 0) + (f.lugarEntregaId ? 1 : 0) + (f.modoEntrega ? 1 : 0) + (f.unidos ? 1 : 0)
      + (f.soloRamos ? 1 : 0) + (f.soloConPromocion ? 1 : 0);
  }

  private guardarFiltros(): void {
    if (this.filtrosActivos === 0 && this.filtros.orden === 'RECIENTES') {
      this.preferenciaFiltro.borrar('pedidos-mis-pedidos');
    } else {
      this.preferenciaFiltro.guardar('pedidos-mis-pedidos', { ...this.filtros });
    }
  }

  /** Lo guardado se copia campo por campo: un valor raro o de otra versión no rompe la pantalla. */
  private aplicarFiltrosGuardados(g: Record<string, unknown> | null): void {
    if (!g) return;
    const base = filtrosPedidosVacios();
    const lista = <T>(v: unknown, validos: IOpcionFiltro<T>[]): T[] =>
      Array.isArray(v) ? (v as T[]).filter(x => validos.some(o => o.valor === x && this.puedeVerOpcion(o))) : [];
    const uno = <T>(v: unknown, validos: IOpcionFiltro<T>[]): T | null =>
      validos.some(o => o.valor === v && this.puedeVerOpcion(o)) ? v as T : null;
    // Un filtro guardado de un bloque que ya no se tiene permitido no se aplica: no se vería en
    // el panel y la persona no tendría cómo quitarlo.
    const numero = (v: unknown, accion: AccionFiltroBloque): number | null =>
      this.puedeFiltro(accion) && typeof v === 'number' && v >= 0 ? v : null;
    const fecha = (v: unknown): string =>
      this.puedeFiltro('filtro-registrado') && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
    const lugar = this.puedeFiltro('filtro-lugar');
    const otros = this.puedeFiltro('filtro-unidos-otros');
    this.filtros = {
      ...base,
      formas: lista(g['formas'], OPCIONES_FORMA),
      estados: lista(g['estados'], OPCIONES_ESTADO),
      dinero: lista(g['dinero'], OPCIONES_DINERO),
      totalDesde: numero(g['totalDesde'], 'filtro-total'),
      totalHasta: numero(g['totalHasta'], 'filtro-total'),
      registroDesde: fecha(g['registroDesde']),
      registroHasta: fecha(g['registroHasta']),
      entrega: uno(g['entrega'], OPCIONES_ENTREGA),
      lugarEntregaId: numero(g['lugarEntregaId'], 'filtro-lugar'),
      lugarNombre: lugar && typeof g['lugarNombre'] === 'string' ? g['lugarNombre'] as string : '',
      modoEntrega: uno(g['modoEntrega'], OPCIONES_MODO),
      unidos: uno(g['unidos'], OPCIONES_UNIDOS),
      soloRamos: otros && g['soloRamos'] === true,
      soloConPromocion: otros && g['soloConPromocion'] === true,
      orden: uno(g['orden'], OPCIONES_ORDEN) ?? 'RECIENTES'
    };
    this.terminoLugar = this.filtros.lugarEntregaId ? this.filtros.lugarNombre : '';
  }

  // Resumen visible de qué filtros están activos ahora mismo, para que no quede a la
  // adivinanza qué combinación se está usando.
  get descripcionBusqueda(): string | null {
    const f = this.filtros;
    const textos = <T>(valores: T[], opciones: IOpcionFiltro<T>[]) =>
      valores.map(v => opciones.find(o => o.valor === v)?.texto ?? String(v));
    const partes: string[] = [];
    if (this.buscarProd) partes.push(`"${this.buscarProd}"`);
    if (f.formas.length)  partes.push(textos(f.formas, OPCIONES_FORMA).join(' o '));
    if (f.estados.length) partes.push(textos(f.estados, OPCIONES_ESTADO).join(' o '));
    if (f.dinero.length)  partes.push(textos(f.dinero, OPCIONES_DINERO).join(' o '));
    if (f.totalDesde != null || f.totalHasta != null) {
      partes.push(`total ${f.totalDesde != null ? 'desde $' + f.totalDesde : ''}${f.totalDesde != null && f.totalHasta != null ? ' ' : ''}${f.totalHasta != null ? 'hasta $' + f.totalHasta : ''}`);
    }
    if (f.registroDesde || f.registroHasta) {
      partes.push(`registrado ${f.registroDesde ? 'desde ' + f.registroDesde : ''}${f.registroDesde && f.registroHasta ? ' ' : ''}${f.registroHasta ? 'hasta ' + f.registroHasta : ''}`);
    }
    if (f.entrega) partes.push(`entrega: ${textos([f.entrega], OPCIONES_ENTREGA)[0]}`);
    if (f.lugarEntregaId && this.terminoLugar) partes.push(`lugar "${this.terminoLugar}"`);
    if (f.modoEntrega) partes.push(textos([f.modoEntrega], OPCIONES_MODO)[0]);
    if (f.unidos) partes.push(textos([f.unidos], OPCIONES_UNIDOS)[0]);
    if (f.soloRamos) partes.push('💐 Ramos de flores');
    if (f.soloConPromocion) partes.push('🏷️ Con promoción');
    return partes.length > 0 ? `Buscando: ${partes.join(' + ')}` : null;
  }

  // Pedido pedido por url (ej. desde /abonos?pedidoId=93, "Ver el pedido") — se guarda al
  // arrancar y se limpia apenas se abre el detalle (o si no se encuentra), para que una
  // búsqueda posterior del usuario no se re-abra sola.
  private pedidoIdDesdeUrl: number | null = null;

  constructor(
    private readonly pedidoService: PedidosService,
    private readonly clienteService: ClienteService,
    public  readonly authService: AuthService,
    private readonly pagoService: PagoService,
    private readonly negocioService: NegocioService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly usuarioService: UsuarioService,
    private readonly floresService: FloresService,
    private readonly grupoService: GrupoPedidoService,
    private readonly preferenciaFiltro: PreferenciaFiltroService
  ) {}

  private readonly destroy$ = new Subject<void>();
  /** Cada tecla del buscador pasa por aquí; se busca 400 ms después de la última. */
  private readonly texto$ = new Subject<void>();
  /** Lo último que se buscó: una tecla que no cambia el texto (flechas, Tab) no vuelve a buscar. */
  private ultimoTextoAdmin = '';
  /**
   * Toda búsqueda del administrador sale por aquí. switchMap descarta la respuesta de una búsqueda
   * vieja que llega tarde (antes se veía el resultado de lo que se escribió antes), y el
   * catchError va adentro para que un error no mate el buscador (regla de CLAUDE.md).
   */
  private readonly busquedaAdmin$ = new Subject<{ buscar: string; filtros: IFiltrosPedidos; pagina: number }>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private prepararBusquedaAdmin(): void {
    this.texto$.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
      if ((this.buscarProd ?? '').trim() !== this.ultimoTextoAdmin) this.buscarPedidoAdmin();
    });
    this.busquedaAdmin$.pipe(
      switchMap(c => this.pedidoService.buscarPedidosAdmin(c.buscar, c.filtros, c.pagina, this.size).pipe(
        catchError(err => {
          const mensaje = err?.error?.mensaje;
          if (err?.status === 400 && mensaje) Swal.fire({ icon: 'info', title: 'Revisa la búsqueda', text: mensaje });
          else console.error(err);
          return of(null);
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      this.cargando = false;
      if (!res) return;
      const data: IPedidosEncontrados | null | undefined = res.data;
      this.resposeGenericPedido = res;
      this.pedidoGenerico = data?.list || [];
      this.totalPaginas = data?.totalPaginas ?? 0;
      this.totalRegistros = data?.totalRegistros ?? 0;
      this.abrirSiVieneDeUrl();
    });
  }

  ngOnInit(): void {
    this.pedidoIdDesdeUrl = Number(this.route.snapshot.queryParamMap.get('pedidoId')) || null;
    this.authService.userId$.subscribe(idUser => { this.idUsuario = idUser; });
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl || null; this.qrFacebook = c.facebookUrl || null; this.qrInstagram = c.instagramUrl || null; this.qrTiktok = c.tiktokUrl || null; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });

    // Catálogo de lugares — lo necesita cualquier usuario (admin filtra la lista, cualquiera
    // puede elegir lugar en el modal de "Entrega" de su propio pedido).
    this.lugarEntregaService.getAll().subscribe({
      next: data => { this.lugares = data; },
      error: () => {}
    });

    if (this.isAdminUser) {
      // Si se llegó con ?pedidoId=93 (ej. desde /abonos → "Ver el pedido"), precarga el buscador
      // con ese número — buscarPedidoAdmin() ya sabe buscar por id exacto (el back lo agregó
      // justo para esto), y su `next` abre el detalle solo si pedidoIdDesdeUrl sigue puesto.
      this.prepararBusquedaAdmin();
      if (this.pedidoIdDesdeUrl) {
        this.buscarProd = String(this.pedidoIdDesdeUrl);
        this.buscarPedidoAdmin();
      } else {
        // Los filtros guardados de esta persona (si no hay o falla, la lista sale sin filtros).
        this.preferenciaFiltro.obtener('pedidos-mis-pedidos').pipe(takeUntil(this.destroy$)).subscribe(g => {
          this.aplicarFiltrosGuardados(g);
          this.buscarPedidoAdmin();
        });
      }
    } else {
      // ⚠️ Antes esto usaba `getDataOneCliente(idUsuario)`, que pega a
      // `/v1/clientes/buscarPorIdCliente/{id}` — ese endpoint espera el id de **cliente**, no el
      // de usuario, y respondía "No autorizado". Como la llamada **no tenía manejo de error**, la
      // pantalla se quedaba vacía para siempre: sin pedidos, sin aviso, sin nada que explicara
      // por qué. No se había notado porque el dueño prueba como admin, y admin entra por la otra
      // rama (`buscarPedidoAdmin`).
      //
      // `buscarClientePorIdUsuario` es justo la traducción usuario → cliente, y es la que ya usan
      // venta-variante y el configurador de ramos para lo mismo.
      this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
        next: (clienteId: any) => {
          if (!clienteId) { this.sinPerfilCliente = true; return; }
          this.clienteId = clienteId;
          this.page = 0;
          this.size = 10;
          if (this.pedidoIdDesdeUrl) {
            this.buscarProd = String(this.pedidoIdDesdeUrl);
            this.buscarClientePorId(this.pedidoIdDesdeUrl);
          } else {
            this.cargarMasPedidos();
          }
        },
        error: () => { this.sinPerfilCliente = true; }
      });
    }
  }

  // Si llegó ?pedidoId=N por la URL y la búsqueda lo encontró, abre su detalle automáticamente
  // y limpia el flag (para que la próxima búsqueda del usuario no se reabra sola). Si no lo
  // encontró, avisa — quedarse en silencio dejaría al usuario viendo una lista vacía sin saber
  // si el link estaba roto o el pedido ya no existe.
  private abrirSiVieneDeUrl(): void {
    if (!this.pedidoIdDesdeUrl) return;
    const encontrado = this.pedidoGenerico.find(p => p.pedido.id === this.pedidoIdDesdeUrl);
    const idBuscado = this.pedidoIdDesdeUrl;
    this.pedidoIdDesdeUrl = null;
    if (encontrado) {
      this.irDetalle(encontrado);
    } else {
      Swal.fire({ icon: 'warning', title: `No se encontró el pedido #${idBuscado}`, text: 'Puede que ya no exista o que no tengas acceso a él.' });
    }
  }

  item: IPedidoGenerico = {
    cliente: { id: 0, correoElectronico: '', nombreCliente: '', numeroTelefonico: '' },
    pedido: { detalles: [], estado_pedido: '', fecha_pedido: '', id: 0 }
  };

  irDetalle(item: IPedidoGenerico) {
    this.mostrarDetalle = true;
    this.item = item;
  }

  /**
   * Desde el detalle se abre otro pedido del grupo. Los que no son titulares no salen en la lista,
   * así que se buscan por número (el back sí los devuelve con el número exacto) y se abren solos.
   */
  abrirOtroPedido(pedidoId: number): void {
    this.mostrarDetalle = false;
    this.pedidoIdDesdeUrl = pedidoId;
    this.buscarProd = String(pedidoId);
    this.buscarPedidoAdmin();
  }

  private static readonly DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  private static readonly MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                                   'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  private static escaparHtml(texto: string | null | undefined): string {
    return (texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private static dia(iso: string): Date {
    const [y, m, d] = iso.split('-').map(n => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }

  /**
   * Entregado, cancelado y PAGADO ya no esperan entrega. La venta de mostrador guarda hoy como
   * fecha de recogida y no tiene lugar, así que sin este filtro diría "Recoge en el local: hoy".
   * PAGADO entra aquí porque todavía no existe el paso de marcar entregado un crédito pagado.
   */
  private static esperaEntrega(p: IPedidoGenerico['pedido']): boolean {
    // Un grupo espera entrega mientras le falte cobrar, aunque el titular ya esté pagado.
    if (p.grupo?.esTitular) return p.grupo.totalGrupo > 0 && p.grupo.saldoGrupo > 0.005;
    const estado = (p.estado_pedido ?? '').toUpperCase();
    return estado !== 'ENTREGADO' && estado !== 'CANCELADO' && estado !== 'PAGADO';
  }

  /** "sáb 4 oct, 10:00 · Zacazonapan", o null si no tiene día o ya no espera entrega. */
  textoEntrega(p: IPedidoGenerico['pedido']): string | null {
    if (!p.fechaEntrega || !MisPedidosComponent.esperaEntrega(p)) return null;
    const d = MisPedidosComponent.dia(p.fechaEntrega);
    let texto = `${MisPedidosComponent.DIAS[d.getDay()]} ${d.getDate()} ${MisPedidosComponent.MESES[d.getMonth()]}`;
    if (p.horaEntrega) texto += `, ${p.horaEntrega}`;
    if (!p.recogeEnLocal && p.lugarEntregaNombre) texto += ` · ${p.lugarEntregaNombre}`;
    return texto;
  }

  /** Días que lleva pasada la fecha de entrega sin entregarse. */
  diasAtraso(p: IPedidoGenerico['pedido']): number {
    if (!p.fechaEntrega || !MisPedidosComponent.esperaEntrega(p)) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((hoy.getTime() - MisPedidosComponent.dia(p.fechaEntrega).getTime()) / 86_400_000);
    return dias > 0 ? dias : 0;
  }

  /** "#102, #105" */
  numerosDe(ids: number[] | null | undefined): string {
    return (ids ?? []).map(id => `#${id}`).join(', ');
  }

  esGrupoCredito(g: GrupoEnLista): boolean {
    const tipo = (g.tipoPedido ?? '').toUpperCase();
    return tipo === 'APARTADO' || tipo === 'FIADO';
  }

  cancelarPedido(item: IPedidoGenerico) {
    // El cliente va por otra puerta: `DELETE /v1/pedidos/delete/{id}` (lo de abajo) es ADMIN-only
    // y le respondía 403 mudo. El back abrió `DELETE /v1/flores/pedidos/{id}/cancelar` para que
    // cancele lo suyo — pero SOLO ramos y SOLO sin ningún pago registrado, así que hay que saber
    // primero si el pedido es un ramo, y eso no viene en la lista.
    if (!this.isAdminUser) {
      this.cancelarComoCliente(item);
      return;
    }

    // Ya entregado = devolución (el back ahora sí permite cancelar en este estado, pero solo
    // admin y sin NO_SE_PRESENTO como motivo — el cliente sí cumplió, solo se devuelve el
    // producto). El botón que dispara esto ya está protegido con !isAdminUser en el HTML.
    const esDevolucion = item.pedido.estado_pedido === 'Entregado';
    const opciones = esDevolucion ? MOTIVOS_CANCELACION.filter(o => o.value !== 'NO_SE_PRESENTO') : undefined;

    // Grupo de botones en vez del input:'radio' nativo de SweetAlert2 (se veía como checklist
    // feo) — mismos motivos, mismo patrón visual de pills que el resto del proyecto.
    const motivoFrag = motivoCancelacionSwalFragment(opciones);

    Swal.fire({
      title: esDevolucion ? '¿Cancelar (devolución) este pedido ya entregado?' : '¿Por qué cancelas este pedido?',
      html: `<p style="color:var(--app-text-muted,#6b7280);margin:0 0 4px">Pedido #${item.pedido.id}</p>${motivoFrag.html}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar pedido',
      cancelButtonText: 'No cancelar',
      confirmButtonColor: 'var(--pk-danger)',
      didOpen: motivoFrag.didOpen,
      preConfirm: motivoFrag.preConfirm
    }).then(result => {
      if (result.isConfirmed) {
        this.pedidoService.cancelarConMotivo(item.pedido.id, result.value).subscribe({
          next: () => {
            this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
            Swal.fire({ title: 'Pedido cancelado correctamente', icon: 'success', timer: 1600, showConfirmButton: false });
          },
          error: (err) => Swal.fire({ title: 'Error al cancelar el pedido', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cancelar el pedido.', icon: 'error' })
        });
      }
    });
  }

  /**
   * Cancelación pedida por el propio cliente. Solo existe para ramos y solo antes de cualquier
   * pago — el back lo valida, pero se comprueba antes para no mandarlo a un error inevitable.
   *
   * No pide motivo: ese endpoint no recibe body. El motivo es para que el admin registre por qué
   * canceló él un pedido ajeno; aquí el cliente cancela el suyo.
   */
  private cancelarComoCliente(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;

    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;

        if (d?.esRamoFlores !== true) {
          Swal.fire({
            icon: 'info',
            title: 'Este pedido no lo puedes cancelar tú',
            text: 'Escríbenos y con gusto lo cancelamos por ti.'
          });
          return;
        }

        if ((d.totalPagado ?? 0) > 0) {
          Swal.fire({
            icon: 'info',
            title: 'Ya hay un pago registrado',
            text: 'Como ya abonaste algo, la cancelación la tiene que hacer un administrador. Escríbenos.'
          });
          return;
        }

        Swal.fire({
          icon: 'warning',
          title: '¿Cancelar tu ramo?',
          html: `<p style="margin:0;color:var(--app-text-muted,#6b7280)">Pedido #${pedidoId}</p>
                 <p style="margin:8px 0 0">Se cancela y ya no se prepara. Si lo quieres de nuevo, tendrás que armarlo otra vez.</p>`,
          showCancelButton: true,
          confirmButtonText: 'Sí, cancelar mi ramo',
          cancelButtonText: 'No, dejarlo así',
          confirmButtonColor: 'var(--pk-danger)',}).then(res => {
          if (!res.isConfirmed) return;

          this.floresService.cancelarPedidoFlores(pedidoId).subscribe({
            next: () => {
              this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== pedidoId);
              Swal.fire({ icon: 'success', title: 'Tu ramo quedó cancelado', timer: 1800, showConfirmButton: false });
            },
            error: err => Swal.fire({
              icon: 'error',
              title: 'No se pudo cancelar',
              text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Inténtalo de nuevo o escríbenos.'
            })
          });
        });
      },
      // Sin detalle no se puede saber si es un ramo — mejor decirlo que mandar una petición que
      // se sabe que va a fallar con 403.
      error: () => Swal.fire({
        icon: 'error',
        title: 'No pudimos abrir tu pedido',
        text: 'Revisa tu conexión e inténtalo de nuevo.'
      })
    });
  }

  // Modal (Swal) para capturar/editar nombreReceptor, direccionEntrega, fechaEntrega y
  // observaciones — PUT /v1/pedidos/{id}/entrega, no requiere admin (cualquiera puede editar
  // su propio pedido), el back solo lo rechaza si el pedido ya está "cancelado".
  abrirInfoEntrega(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;

    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => this.mostrarModalEntrega(pedidoId, r?.data ?? null),
      error: () => this.mostrarModalEntrega(pedidoId, null)
    });
  }

  private mostrarModalEntrega(pedidoId: number, actual: PedidoDetalleResponse | null): void {
    // Lo escribe el cliente al hacer su pedido: se escapa porque va dentro del HTML del aviso, y
    // un nombre con `"><img onerror=…>` corría código en la sesión del administrador.
    const esc = MisPedidosComponent.escaparHtml;
    const nombreReceptor   = esc(actual?.nombreReceptor);
    const direccionEntrega = esc(actual?.direccionEntrega);
    const fechaEntrega     = esc(actual?.fechaRecogida);
    const observaciones    = esc(actual?.observaciones);
    const lugarEntregaId   = actual?.lugarEntregaId ?? null;
    const urlFacebook      = esc(actual?.urlFacebook);
    const referencias      = esc(actual?.referencias);

    // Ubicación exacta de la casa del cliente (2026-08-22) — distinto de LugarEntrega (la
    // zona/pueblo). Variables mutables capturadas por el `didOpen`/`preConfirm` del Swal de
    // abajo: se actualizan al hacer clic en el mapa o arrastrar el pin. Si el pedido ya tenía
    // ubicación guardada, arranca marcado; si no, arranca sin marcar y no se manda nada al
    // guardar salvo que el admin toque el mapa.
    let latActual: number | null = actual?.latitud ?? null;
    let lngActual: number | null = actual?.longitud ?? null;
    let ubicacionTocada = latActual != null && lngActual != null;
    // Referencia al mapa para destruirlo en `willClose` — sin esto, cada vez que se abre este
    // modal se crea una instancia de Leaflet nueva sin liberar la anterior (listeners y tiles
    // quedan colgando, aunque el DOM ya se haya borrado).
    let mapaLeaflet: L.Map | null = null;

    // Latitud/longitud numéricas son un dato interno (coordenadas exactas de la casa del
    // cliente) — solo el admin debe verlas. El cliente sigue pudiendo marcar/arrastrar el pin
    // en el mapa igual que siempre, solo que no se le muestra el texto con los números.
    const puedeVerCoordenadas = this.isAdminUser;

    const opcionesLugar = this.lugares.map(l =>
      `<option value="${l.id}" ${l.id === lugarEntregaId ? 'selected' : ''}>${esc(l.nombre)}</option>`
    ).join('');

    // En un ramo, fecha y lugar NO se editan desde aquí — ni el cliente ni el admin. Este campo
    // es libre y no valida nada: cambiar la fecha a mano se salta los plazos del taller y el
    // cargo por entrega urgente que sí calcula `fechas-disponibles`, y cambiar la zona altera un
    // costo de envío ya cobrado. La fecha del ramo se cambia con "✏️ Editar ramo" (detalle del
    // pedido), que sí recotiza. Mismo criterio que el botón "−" de quitar líneas.
    const esRamo = actual?.esRamoFlores === true;
    const bloqueo = esRamo ? 'disabled' : '';
    const avisoRamo = esRamo
      ? `<p class="mp-entrega-aviso">🌹 La fecha y el lugar de este ramo se cambian desde
           <b>«✏️ Editar ramo»</b> (dentro del detalle del pedido), para que se vuelvan a calcular
           los días que tarda el taller y el cargo por entrega urgente.</p>`
      : '';

    Swal.fire({
      title: `📍 Info de entrega — Pedido #${pedidoId}`,
      width: 480,
      html: `
        <style>
          .mp-entrega-form { text-align:left; display:flex; flex-direction:column; gap:12px; margin-top:4px; }
          .mp-entrega-row { display:flex; gap:10px; }
          .mp-entrega-row .mp-entrega-field { flex:1; min-width:0; }
          .mp-entrega-field { display:flex; flex-direction:column; gap:4px; }
          .mp-entrega-label {
            font-size:.78rem; font-weight:600; color:var(--app-text-muted,#6b7280);
            display:flex; align-items:center; gap:5px;
          }
          .mp-entrega-input, .mp-entrega-select, .mp-entrega-textarea {
            width:100%; margin:0; box-sizing:border-box;
            padding:9px 12px; border-radius:10px;
            border:1.5px solid var(--card-border,#e5e7eb);
            background:var(--card-bg,#fff); color:var(--app-text,#1f2937);
            font-size:.88rem; font-family:inherit; transition:border-color .15s;
          }
          .mp-entrega-textarea { resize:vertical; min-height:44px; }
          .mp-entrega-input:focus, .mp-entrega-select:focus, .mp-entrega-textarea:focus {
            outline:none; border-color:var(--app-accent,var(--brand-1));
            box-shadow:0 0 0 3px var(--app-accent-soft,rgba(var(--app-accent-rgb),.12));
          }
          .mp-entrega-input:disabled, .mp-entrega-select:disabled {
            opacity:.6; cursor:not-allowed;
            background:var(--app-surface-2,#f1f5f9);
          }
          /* El popup nativo de <option> no respeta background/color de autor via custom
             properties (mismo bug ya encontrado en venta-variante/gestion-lugares/
             entregas-zona/venta-directa) -- de noche el select queda ilegible aunque
             --card-bg/--app-text ya esten bien definidos para el resto del formulario. Mismo
             patron robusto (color-scheme forzado + colores fijos). Este bloque va dentro del
             <style> inyectado por Swal, asi que "body.theme-dark" real basta -- no hace falta
             :host-context aqui. */
          body.theme-dark .mp-entrega-select {
            color-scheme: light !important;
            background-color: #ffffff !important;
            color: #1f2937 !important;
            border-color: #e5e7eb !important;
          }
          .mp-entrega-aviso {
            margin:0; padding:9px 12px; border-radius:10px; font-size:.78rem; line-height:1.45;
            text-align:left; color:var(--app-text,#1f2937);
            background:var(--app-accent-soft,rgba(var(--app-accent-rgb),.12));
            border:1px solid var(--card-border,#e5e7eb);
          }
          .mp-mapa {
            width:100%; height:200px; border-radius:10px;
            border:1.5px solid var(--card-border,#e5e7eb);
          }
          .mp-mapa-hint { font-size:.74rem; color:var(--app-text-muted,#6b7280); margin:0; }
          .mp-mapa-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
          .mp-mapa-coords { font-size:.8rem; font-weight:600; color:var(--app-text,#1f2937); }
          .mp-mapa-geo {
            border:none; background:none; padding:0; cursor:pointer;
            font-size:.76rem; font-weight:700; color:var(--app-accent,var(--brand-1));
            flex-shrink:0;
          }
          .mp-mapa-geo:hover { text-decoration:underline; }
        </style>
        <div class="mp-entrega-form">
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">👤 Nombre de quien recibe</label>
            <input id="sw-receptor" class="mp-entrega-input" placeholder="Opcional" value="${nombreReceptor}">
          </div>
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">🏠 Dirección de entrega</label>
            <textarea id="sw-direccion" class="mp-entrega-textarea" placeholder="Opcional">${direccionEntrega}</textarea>
          </div>
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">🗺️ Ubicación exacta (opcional)</label>
            <div id="sw-mapa" class="mp-mapa"></div>
            <div class="mp-mapa-row">
              ${puedeVerCoordenadas ? '<span id="sw-coords" class="mp-mapa-coords"></span>' : '<span></span>'}
              <button type="button" id="sw-geo" class="mp-mapa-geo">📡 Usar mi ubicación</button>
            </div>
            <p class="mp-mapa-hint">Toca el mapa (o arrastra el pin) para marcar la casa exacta del cliente.</p>
          </div>
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">🧭 Referencias del lugar</label>
            <input id="sw-referencias" class="mp-entrega-input" placeholder="Ej. portón verde, junto a la tienda" value="${referencias}">
          </div>
          <div class="mp-entrega-row">
            <div class="mp-entrega-field">
              <label class="mp-entrega-label">📅 Fecha de entrega</label>
              <input id="sw-fecha" type="date" class="mp-entrega-input" value="${fechaEntrega}" ${bloqueo}>
            </div>
            <div class="mp-entrega-field">
              <label class="mp-entrega-label">📍 Lugar de entrega</label>
              <select id="sw-lugar" class="mp-entrega-select" ${bloqueo}>
                <option value="">Sin especificar</option>
                ${opcionesLugar}
              </select>
            </div>
          </div>
          ${avisoRamo}
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">📘 Link de Facebook</label>
            <input id="sw-facebook" class="mp-entrega-input" placeholder="Opcional" value="${urlFacebook}">
          </div>
          <div class="mp-entrega-field">
            <label class="mp-entrega-label">📝 Observaciones</label>
            <textarea id="sw-obs" class="mp-entrega-textarea" placeholder="Opcional">${observaciones}</textarea>
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: '💾 Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const centro: L.LatLngTuple = ubicacionTocada ? [latActual!, lngActual!] : CENTRO_MAPA_DEFAULT;
        const mapa = L.map('sw-mapa', { attributionControl: false }).setView(centro, ubicacionTocada ? 16 : 13);
        mapaLeaflet = mapa;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc'
        }).addTo(mapa);

        let marker: L.Marker | null = null;

        const textoCoords = document.getElementById('sw-coords');
        const actualizarTexto = () => {
          if (!textoCoords) return;
          textoCoords.textContent = ubicacionTocada
            ? `📍 ${latActual!.toFixed(6)}, ${lngActual!.toFixed(6)}`
            : 'Sin marcar todavía';
        };

        const colocar = (lat: number, lng: number) => {
          latActual = lat; lngActual = lng; ubicacionTocada = true;
          if (marker) {
            marker.setLatLng([lat, lng]);
          } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(mapa);
            marker.on('dragend', () => { const p = marker!.getLatLng(); colocar(p.lat, p.lng); });
          }
          actualizarTexto();
        };

        if (ubicacionTocada) colocar(latActual!, lngActual!);
        actualizarTexto();

        mapa.on('click', (e: L.LeafletMouseEvent) => colocar(e.latlng.lat, e.latlng.lng));

        document.getElementById('sw-geo')?.addEventListener('click', () => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            pos => { colocar(pos.coords.latitude, pos.coords.longitude); mapa.setView([pos.coords.latitude, pos.coords.longitude], 17); },
            () => Swal.showValidationMessage('No se pudo obtener tu ubicación — revisa los permisos del navegador.')
          );
        });

        // Leaflet mide el contenedor al crearse; dentro de un modal que recién apareció puede
        // medir 0 y el mapa sale en blanco/recortado. invalidateSize() lo corrige una vez que
        // el layout del Swal ya está listo.
        setTimeout(() => mapa.invalidateSize(), 60);
      },
      willClose: () => {
        mapaLeaflet?.remove();
        mapaLeaflet = null;
      },
      preConfirm: () => ({
        nombreReceptor:   (document.getElementById('sw-receptor') as HTMLInputElement)?.value?.trim() || undefined,
        direccionEntrega: (document.getElementById('sw-direccion') as HTMLTextAreaElement)?.value?.trim() || undefined,
        referencias:      (document.getElementById('sw-referencias') as HTMLInputElement)?.value?.trim() || undefined,
        // Solo se mandan si el admin tocó el mapa (colocó o ya venía con un punto guardado) —
        // el back no soporta "borrar" latitud/longitud mandando null, así que nunca hay que
        // mandarlos en falso cuando nunca se marcó nada.
        latitud:          ubicacionTocada ? latActual! : undefined,
        longitud:         ubicacionTocada ? lngActual! : undefined,
        // En un ramo se omiten a propósito: el back interpreta ausente como "no tocar este campo".
        // Un <input disabled> igual devuelve su valor por JS, así que sin este guard se
        // reescribirían con lo mismo — inofensivo, pero mejor no mandarlos.
        fechaEntrega:     esRamo ? undefined : ((document.getElementById('sw-fecha') as HTMLInputElement)?.value || undefined),
        lugarEntregaId:   esRamo ? undefined : (Number((document.getElementById('sw-lugar') as HTMLSelectElement)?.value) || undefined),
        urlFacebook:      (document.getElementById('sw-facebook') as HTMLInputElement)?.value?.trim() || undefined,
        observaciones:    (document.getElementById('sw-obs') as HTMLTextAreaElement)?.value?.trim() || undefined
      })
    }).then(result => {
      if (!result.isConfirmed) return;
      this.pedidoService.actualizarEntrega(pedidoId, result.value).subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Datos de entrega guardados', timer: 1800, showConfirmButton: false }),
        error: err => Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar la información de entrega.' })
      });
    });
  }

  cobrarAdmin(item: IPedidoGenerico) {
    const forma = this.formaCobroCredito(item);
    if (forma) {
      this.abrirCobroCredito(item, forma);
      return;
    }
    const grupo = item.pedido.grupo;
    if (grupo) {
      this.cobrarGrupo(item, grupo);
      return;
    }
    // APARTADO/FIADO no se cobran con este diálogo — el back rechaza
    // PUT /v1/pedidos/confirmar/{id} para esos tipos ("se liquidan mediante abonos").
    // ⚠️ `item.pedido.tipoPedido` viene de la LISTA (buscarClientePedido) — ese campo
    // nunca se confirmó en el spec del back para ese endpoint (solo para savePedido,
    // ventas/save y los reportes de abonos), así que puede llegar undefined aunque el
    // pedido SÍ sea crédito. Por eso el chequeo real se hace contra el DETALLE
    // (GET /{id}/detalle), que sí está confirmado — el de la lista solo se usa como
    // atajo optimista para no pedir el detalle en pedidos NORMAL (el caso más común).
    if (item.pedido.tipoPedido === 'APARTADO' || item.pedido.tipoPedido === 'FIADO') {
      this.irACobrarCredito(item, item.pedido.tipoPedido);
      return;
    }

    this.pedidoService.getDetallePedido(item.pedido.id).subscribe({
      next: r => {
        const tp = r?.data?.tipoPedido;
        if (tp === 'APARTADO' || tp === 'FIADO') {
          this.irACobrarCredito(item, tp);
        } else {
          this.abrirDialogoCobroNormal(item);
        }
      },
      // Si falla el detalle, no bloquear el cobro normal — se sigue con el flujo de
      // siempre; si en realidad era crédito, el back lo rechazará y el usuario lo verá.
      error: () => this.abrirDialogoCobroNormal(item)
    });
  }

  /**
   * Un grupo se cobra entero desde la card del titular. De contado: un solo cobro por lo que falte
   * de todos. A crédito: se abona al grupo en el detalle, que reparte del pedido más viejo al más nuevo.
   */
  private cobrarGrupo(item: IPedidoGenerico, grupo: GrupoEnLista): void {
    if (this.esGrupoCredito(grupo)) {
      this.abrirCobroCredito(item, (grupo.tipoPedido ?? '').toUpperCase() === 'APARTADO' ? 'liquidar-grupo' : 'abonar-grupo');
      return;
    }
    if (grupo.saldoGrupo <= 0) {
      Swal.fire({ icon: 'info', title: 'Ya está cobrado', text: 'Todos los pedidos de este grupo ya están cobrados o cancelados.' });
      return;
    }
    this.abrirDialogoCobroNormal(item);
  }

  /** El grupo que se está cobrando en el diálogo, si el pedido está unido. */
  get grupoACobrar(): GrupoEnLista | null {
    return this.pedidoACobrar?.pedido.grupo ?? null;
  }

  get tituloCobro(): string {
    const g = this.grupoACobrar;
    if (!g || !this.pedidoACobrar) return `Pedido #${this.pedidoACobrar?.pedido.id ?? ''}`;
    return `Pedidos ${this.numerosDe([this.pedidoACobrar.pedido.id, ...g.otrosPedidos])} (unidos)`;
  }

  // ── Cobro a crédito desde la card (2026-10-06) ──────────────────────────────────
  // Antes "Cobrar" mandaba a Créditos / Abonos y había que regresar a la lista. Ahora cada caso
  // abre su propio formulario ahí mismo (carpeta ../cobro, un formulario por caso).

  /** El formulario de cobro a crédito que está abierto, y de qué card. */
  cobroCredito: { forma: FormaCobroCredito; item: IPedidoGenerico } | null = null;

  /** Qué formulario le toca a la card; `null` = es de contado y va con "Cobrar". */
  formaCobroCredito(item: IPedidoGenerico): FormaCobroCredito | null {
    // Unido (sea la card del titular o un miembro abierto por su número): el dinero es del grupo.
    const g = item.pedido.grupo;
    if (g) {
      if (!this.esGrupoCredito(g)) return null;
      return (g.tipoPedido ?? '').toUpperCase() === 'APARTADO' ? 'liquidar-grupo' : 'abonar-grupo';
    }
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO') return 'liquidar';
    if (tp === 'FIADO') return 'abonar';
    return null;
  }

  textoBotonCobro(item: IPedidoGenerico): string {
    switch (this.formaCobroCredito(item)) {
      case 'liquidar':
      case 'liquidar-grupo': return 'Liquidar';
      case 'abonar': return 'Dar abono';
      case 'abonar-grupo': return 'Abonar al grupo';
      default: return 'Cobrar';
    }
  }

  /** Contado pide la acción "cobrar"; un Apartado o Ir pagando, "abonar" (la del detalle). */
  puedeCobrarCard(item: IPedidoGenerico): boolean {
    if (!this.isAdminUser) return false;
    const accion = this.formaCobroCredito(item) ? 'abonar' : 'cobrar';
    return this.authService.tieneAccion('pedidos/mis-pedidos', accion);
  }

  private abrirCobroCredito(item: IPedidoGenerico, forma: FormaCobroCredito): void {
    this.cobroCredito = { forma, item };
  }

  cerrarCobroCredito(): void {
    this.cobroCredito = null;
  }

  /** Ya se cobró: la card se vuelve a pedir y se queda en la misma página. */
  alCobrarCredito(): void {
    this.cobroCredito = null;
    this.buscarPedidoAdmin(false);
  }

  /** "¿Dejó solo una parte?" en Liquidar: el detalle tiene 🔁 Cambiar forma de cobro. */
  irAlDetalleDesdeCobro(item: IPedidoGenerico): void {
    this.cobroCredito = null;
    this.irDetalle(item);
  }

  /** El tipo se supo por el detalle (la card no lo traía): se abre el formulario que le toca. */
  private irACobrarCredito(item: IPedidoGenerico, tipo: 'APARTADO' | 'FIADO'): void {
    this.abrirCobroCredito(item, tipo === 'APARTADO' ? 'liquidar' : 'abonar');
  }

  private abrirDialogoCobroNormal(item: IPedidoGenerico): void {
    this.pedidoACobrar = item;
    this.resetDialogo();

    this.pagoService.getOpcionesEstructuradas().subscribe(res => {
      this.opcionesEstructuradas = res.data ?? [];
      this.mostrarDialogoCobro = true;
    });
  }

  seleccionarTipoPago(opcion: IOpcionPagoDto) {
    this.tipoPagoActivo = opcion;
    this.mesesSeleccionado = null;

    if (!opcion.mostrarMeses) {
      this.pagosYMesesId = opcion.pagosYMesesId;
    } else {
      this.pagosYMesesId = null;
    }
  }

  seleccionarMeses(opcion: IOpcionMesesDto) {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId = opcion.pagosYMesesId;
  }

  confirmarCobro() {
    if (!this.pedidoACobrar) return;
    if (this.grupoACobrar) {
      this.confirmarCobroGrupo(this.grupoACobrar);
      return;
    }

    const item = this.pedidoACobrar;
    item.pedido.estado_pedido = 'Entregado';
    item.pagosYMesesId = this.pagosYMesesId ?? 0;
    this.pedidoService.updateService(item.pedido.id, item).subscribe(
      () => {
        this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
        this.mostrarDialogoCobro = false;
        Swal.fire({ title: 'Pedido cobrado correctamente', icon: 'success', draggable: true });
      },
      (err) => {
        this.mostrarDialogoCobro = false;
        // Red de seguridad: si el back rechaza porque el pedido en realidad es
        // crédito (APARTADO/FIADO), ofrecer el mismo redirect a Abonos en vez del
        // error genérico — cubre el caso donde ni el campo de la lista ni el
        // detalle lo detectaron a tiempo.
        const msg: string = (err?.error?.mensaje ?? err?.error?.message ?? '').toLowerCase();
        if (msg.includes('abono') || msg.includes('apartado') || msg.includes('fiado')) {
          this.irACobrarCredito(item, item.pedido.tipoPedido === 'APARTADO' ? 'APARTADO' : 'FIADO');
          return;
        }
        Swal.fire({ title: 'Ocurrio un error al cobrar el pedido, intente de nuevo', text: err?.error?.mensaje ?? err?.error?.message ?? '', icon: 'error', draggable: true });
      }
    );
  }

  private confirmarCobroGrupo(grupo: GrupoEnLista): void {
    if (!this.pagosYMesesId) return;
    this.grupoService.cobrarDeContado(grupo.grupoId, this.pagosYMesesId).subscribe({
      next: r => {
        this.mostrarDialogoCobro = false;
        const cobrados = r?.data?.pedidosCobrados ?? [];
        Swal.fire({
          icon: 'success',
          title: 'Pedidos cobrados',
          text: cobrados.length ? `Se cobraron los pedidos ${this.numerosDe(cobrados)}.` : 'Los pedidos del grupo quedaron cobrados.'
        });
        this.buscarPedidoAdmin(false);
      },
      error: err => {
        this.mostrarDialogoCobro = false;
        Swal.fire({ icon: 'error', title: 'No se pudo cobrar el grupo', text: err?.error?.mensaje ?? err?.error?.message ?? 'Intenta de nuevo.' });
      }
    });
  }

  cancelarDialogo() {
    this.stopPolling();
    if (this.intentId && this.estadoTerminal === 'procesando') {
      this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    }
    this.mostrarDialogoCobro = false;
    this.resetDialogo();
  }

  private resetDialogo() {
    this.opcionesEstructuradas = [];
    this.tipoPagoActivo = null;
    this.mesesSeleccionado = null;
    this.pagosYMesesId = null;
    this.estadoTerminal = 'idle';
    this.errorTerminal = null;
    this.intentId = null;
  }

  get esTarjeta(): boolean {
    if (this.tipoPagoActivo == null) return false;
    if (this.tipoPagoActivo.requiereTerminal != null) return this.tipoPagoActivo.requiereTerminal;
    const f = (this.tipoPagoActivo.formaPago ?? '').toLowerCase();
    return f.includes('tarjeta') || f.includes('debito') || f.includes('débito')
        || f.includes('credito') || f.includes('crédito')
        || this.tipoPagoActivo.mostrarMeses;
  }

  get totalPedido(): number {
    if (this.grupoACobrar) return this.grupoACobrar.saldoGrupo;
    return (this.pedidoACobrar?.pedido.detalles ?? [])
      .reduce((sum, d) => sum + d.sub_total, 0);
  }

  get puedeEnviarTerminal(): boolean {
    if (!this.esTarjeta) return false;
    if (this.tipoPagoActivo?.mostrarMeses) return this.mesesSeleccionado !== null;
    return this.pagosYMesesId !== null;
  }

  get puedeConfirmar(): boolean {
    if (this.esTarjeta) return false;
    return this.pagosYMesesId !== null;
  }

  enviarATerminal(): void {
    if (!this.pedidoACobrar || !this.pagosYMesesId) return;
    this.estadoTerminal = 'procesando';

    const request: ITerminalIniciarRequest = {
      pedidoId:      this.pedidoACobrar.pedido.id,
      clienteId:     this.pedidoACobrar.cliente.id,
      pagosYMesesId: this.pagosYMesesId,
      cuotas:        this.mesesSeleccionado?.cuotas ?? 1,
      totalMonto:    this.totalPedido,
      descripcion:   this.grupoACobrar ? this.tituloCobro : `Pedido #${this.pedidoACobrar.pedido.id}`
    };

    this.pagoService.iniciarPagoTerminal(request).subscribe({
      next: res => {
        this.intentId = res.intentId;
        this.startPolling(res.intentId);
      },
      error: (err: HttpErrorResponse) => {
        const msg: string = err.error?.mensaje ?? err.error?.message ?? 'Error al conectar con la terminal.';
        this.errorTerminal = msg;
        this.estadoTerminal = err.status === 429 ? 'bloqueado' : 'rechazado';
      }
    });
  }

  cancelarTerminal(): void {
    this.stopPolling();
    if (this.intentId) {
      this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    }
    this.estadoTerminal = 'cancelado';
    this.intentId = null;
  }

  private startPolling(intentId: string): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.pagoService.getEstadoTerminal(intentId).subscribe({
        next: res => {
          if (res.estado === 'FINISHED') {
            this.stopPolling();
            this.estadoTerminal = 'aprobado';
            this.confirmarCobro();
          } else if (res.estado === 'CANCELED') {
            this.stopPolling();
            this.estadoTerminal = 'cancelado';
          }
        },
        error: () => { this.stopPolling(); this.estadoTerminal = 'rechazado'; }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  page = 0;
  size = 10;
  cargando = false;

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    if (atBottom && !this.cargando) {
      if (!this.isAdminUser) this.cargarMasPedidos();
    }
  }

  totalPaginas: number = 0;

  cargarMasPedidos(): void {
    if (this.page <= this.totalPaginas) {
      this.cargando = true;
      this.cargarPedidosDesdeBase();
    }
  }

  cargarPedidosDesdeBase() {
    this.pedidoService.getDataOnePedido(this.clienteId, this.size, this.page).subscribe(
      sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...(this.resposeGenericPedido.data?.list || []));
        // Más reciente primero. El orden de cada página tal cual la devuelve el back no está
        // garantizado (no hay ORDER BY documentado), así que se ordena en el front por número
        // de pedido descendente sobre el acumulado completo cada vez que llega una página nueva.
        this.ordenarPedidosDescendente();
        this.page++;
        this.cargando = false;
      },
      err => console.error(err)
    );
  }

  // Mayor a menor por número de pedido (#id) — el más reciente arriba. Ver comentario en
  // cargarPedidosDesdeBase(): el back no garantiza el orden, se fuerza aquí.
  private ordenarPedidosDescendente(): void {
    this.pedidoGenerico.sort((a, b) => b.pedido.id - a.pedido.id);
  }

  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value;
    this.buscarProd = texto;

    if (this.isAdminUser) {
      this.texto$.next();
    } else {
      if (this.buscarProd === '') {
        this.cargarMasPedidos();
      } else {
        const pedido = Number(this.buscarProd);
        if (!isNaN(pedido) && pedido > 0) {
          this.buscarClientePorId(pedido);
        } else {
          Swal.fire({ title: 'Ingrese el numero de pedido', icon: 'info', draggable: false });
        }
      }
    }
  }

  // Extraído de buscarProductos() para poder llamarlo también desde ngOnInit cuando se llega
  // con ?pedidoId=N por la URL (ej. desde /abonos → "Ver el pedido").
  private buscarClientePorId(pedido: number): void {
    this.cargando = true;
    this.pedidoService.getDataOnePedidoById(pedido, this.clienteId, 10, 0).subscribe({
      next: sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico = sus.data?.list || [];
        this.ordenarPedidosDescendente();
        this.page++;
        this.cargando = false;
        this.abrirSiVieneDeUrl();
      },
      error: err => { this.cargando = false; console.error(err); }
    });
  }

  mostrarProductos(mostrar: boolean): void {
    this.mostrarDetalle = mostrar;
    // En el detalle se cambia la forma de cobro, se abona o se agregan artículos: sin recargar,
    // la card seguía mostrando el tipo y el total de antes.
    if (!mostrar && this.isAdminUser) this.buscarPedidoAdmin(false);
  }

  // Admin: paginación real (Anterior/Siguiente), no infinite scroll — mismo patrón que
  // variante/buscar y el catálogo de lugares-entrega. `reset=true` (default) es una búsqueda/
  // filtro nuevo → vuelve a la página 0; `reset=false` lo usan paginaAnteriorAdmin()/
  // paginaSiguienteAdmin() para navegar sin perder los filtros activos.
  buscarPedidoAdmin(reset: boolean = true) {
    this.size = 10;
    if (reset) this.page = 0;

    const texto = (this.buscarProd ?? '').trim();
    this.ultimoTextoAdmin = texto;
    const esNumero = /^#?\s*\d+$/.test(texto);
    if (texto && !esNumero && texto.length < 3) {
      this.avisoBusqueda = 'Escribe al menos 3 letras para buscar por nombre, teléfono, correo o artículo.';
      return;
    }
    this.avisoBusqueda = null;
    this.cargando = true;
    // Abrir un pedido por su número (link desde Abonos o desde otro pedido del grupo) no debe
    // depender de los filtros puestos: con "Pagados" marcado, un Por cobrar no saldría nunca.
    const filtros = this.pedidoIdDesdeUrl ? filtrosPedidosVacios() : this.filtros;
    this.busquedaAdmin$.next({ buscar: texto, filtros, pagina: this.page });
  }

  paginaAnteriorAdmin(): void {
    if (this.page <= 0) return;
    this.page--;
    this.buscarPedidoAdmin(false);
  }

  paginaSiguienteAdmin(): void {
    if (this.page + 1 >= this.totalPaginas) return;
    this.page++;
    this.buscarPedidoAdmin(false);
  }

  // ── Filtro por lugar de entrega (autocomplete simple, catálogo pequeño → filtrado local) ──
  onBuscarLugar(): void {
    const t = this.terminoLugar.trim().toLowerCase();
    this.lugaresFiltrados = t
      ? this.lugares.filter(l => l.nombre.toLowerCase().includes(t))
      : this.lugares;
    this.mostrarDropdownLugar = true;
  }

  seleccionarLugar(l: ILugarEntrega): void {
    this.filtros.lugarEntregaId = l.id;
    this.filtros.lugarNombre = l.nombre;
    this.terminoLugar = l.nombre;
    this.mostrarDropdownLugar = false;
    this.alCambiarFiltros();
  }

  limpiarFiltroLugar(): void {
    this.filtros.lugarEntregaId = null;
    this.filtros.lugarNombre = '';
    this.terminoLugar = '';
    this.mostrarDropdownLugar = false;
    this.alCambiarFiltros();
  }

  // El (mousedown) de seleccionarLugar() necesita disparar ANTES que este (blur) — un delay
  // corto es el patrón estándar para que el clic en el dropdown no se pierda.
  cerrarDropdownLugarConDelay(): void {
    setTimeout(() => { this.mostrarDropdownLugar = false; }, 200);
  }

  // Para crédito el back guarda estado_pedido = 'APARTADO'/'FIADO' (el mismo valor que
  // tipoPedido) hasta liquidarlo — mostrar ese texto crudo en el badge de estado repite
  // exactamente lo que ya dice el badge de tipo ("📦 Apartado" + "APARTADO" abajo). Para
  // crédito se muestra el estado de pago en su lugar; NORMAL/Cancelado no cambian.
  estadoBadge(item: IPedidoGenerico): { icono: string; texto: string } {
    // La card del titular habla del grupo: un abono al grupo liquida primero al pedido más viejo,
    // así que el titular podía decir "Pagado" mientras la misma card decía "Falta $100".
    const g = item.pedido.grupo;
    if (g?.esTitular) {
      if (g.totalGrupo <= 0) return { icono: 'pi-times-circle', texto: 'Cancelado' };
      const credito = this.esGrupoCredito(g);
      return g.saldoGrupo > 0.005
        ? { icono: 'pi-clock', texto: credito ? 'Por cobrar' : 'Pendiente' }
        : { icono: 'pi-check-circle', texto: credito ? 'Pagado' : 'Entregado' };
    }
    // Cancelado va primero: un Ir pagando cancelado mostraba "Por cobrar" (2026-09-29).
    if (this.esCancelado(item)) {
      return { icono: 'pi-times-circle', texto: 'Cancelado' };
    }
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO' || tp === 'FIADO') {
      return item.pedido.estado_pedido === 'PAGADO'
        ? { icono: 'pi-check-circle', texto: 'Pagado' }
        : { icono: 'pi-clock', texto: 'Por cobrar' };
    }
    const icono = item.pedido.estado_pedido === 'Entregado' ? 'pi-check-circle' : 'pi-clock';
    return { icono, texto: item.pedido.estado_pedido };
  }

  // El back guarda 'cancelado' en minúscula; comparar contra 'Cancelado' nunca coincidía, así
  // que la card no se enteraba y el botón Cancelar quedaba habilitado.
  esCancelado(item: IPedidoGenerico): boolean {
    return (item.pedido.estado_pedido ?? '').toLowerCase() === 'cancelado';
  }

  // El botón "Cobrar" solo comparaba contra 'Entregado' (venta normal) — un crédito ya
  // liquidado (estado_pedido = 'PAGADO') o un pedido cancelado seguían mostrando el botón
  // clickeable, y al hacer clic el back lo rechazaba (o mandaba a Abonos, que a su vez decía
  // "ya está pagado"). Mismo criterio de tipoPedido que ya usan estadoBadge()/puedeGenerarTicket().
  pedidoYaCobrado(item: IPedidoGenerico): boolean {
    // Unido: lo que manda es el grupo, no el estado de este pedido (el titular puede estar
    // cancelado y quedar otros por cobrar).
    if (item.pedido.grupo) return item.pedido.grupo.saldoGrupo <= 0;
    const estado = item.pedido.estado_pedido;
    if (this.esCancelado(item)) return true;
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO' || tp === 'FIADO') return estado === 'PAGADO';
    return estado === 'Entregado';
  }

  /**
   * Lo que le falta pagar a un pedido a crédito que ya tiene abonos; `null` si no aplica (contado,
   * sin abonos, pagado o cancelado). La card mostraba solo el total, y un pedido recién separado de
   * un grupo parecía seguir debiendo todo aunque ya se le hubiera dejado parte de lo abonado.
   */
  faltaDeCredito(item: IPedidoGenerico): number | null {
    const tp = item.pedido.tipoPedido;
    const estado = (item.pedido.estado_pedido ?? '').toUpperCase();
    if ((tp !== 'APARTADO' && tp !== 'FIADO') || estado === 'PAGADO' || estado === 'CANCELADO') return null;
    const pagado = item.pedido.totalPagado ?? 0;
    if (pagado <= 0) return null;
    const total = item.pedido.detalles.reduce((s, d) => s + d.sub_total, 0);
    const falta = Math.round((total - pagado) * 100) / 100;
    return falta > 0 ? falta : null;
  }

  // Pre-checa con lo que YA hay en la lista (sin pedir el detalle): para NORMAL basta con
  // estado_pedido; para crédito, el back confirmó (2026-07-24) que totalPagado ya viene en
  // este mismo objeto — antes se dejaba habilitado siempre porque no había forma de saberlo
  // de antemano. puedeImprimir() (con el detalle completo) sigue como red de seguridad al
  // hacer clic, por si este dato llegara desactualizado entre la carga y el clic.
  puedeGenerarTicket(item: IPedidoGenerico): boolean {
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO' || tp === 'FIADO') {
      return (item.pedido.totalPagado ?? 0) > 0;
    }
    return item.pedido.estado_pedido === 'Entregado';
  }

  // Chequeo real, con el detalle completo — cubre el caso crédito sin abonos que
  // puedeGenerarTicket() no puede detectar de antemano.
  private puedeImprimir(d: PedidoDetalleResponse): boolean {
    const esCredito = d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO';
    if (esCredito) {
      return d.estadoPedido === 'PAGADO' || (d.totalPagado ?? 0) > 0 || (d.abonos?.length ?? 0) > 0;
    }
    return d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO';
  }

  imprimirTicketPedido(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;
    if (this.imprimiendoTicket[pedidoId]) return;

    this.imprimiendoTicket[pedidoId] = true;
    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        this.imprimiendoTicket[pedidoId] = false;
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }
        if (!this.puedeImprimir(d)) {
          Swal.fire({ icon: 'info', title: 'Todavía no hay ningún pago', text: 'Este pedido aún no se ha cobrado/recogido, o no tiene abonos registrados — no hay nada que imprimir todavía.' });
          return;
        }

        if (d.metodoPago || d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO') {
          // Se muestra un botón de confirmación dedicado y se imprime en su propio .then():
          // window.open() solo escapa al bloqueador de popups si ocurre síncrono a un
          // clic del usuario, no dentro del callback de una petición HTTP.
          Swal.fire({
            title: `Ticket pedido #${pedidoId}`,
            text: '¿Deseas imprimir el ticket?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimir ticket',
            cancelButtonText: 'Cancelar'
          }).then(swRes => {
            if (swRes.isConfirmed) this.buildAndPrintTicket(d, item, d.metodoPago ?? '', d.montoDado ?? null);
          });
          return;
        }

        // Pedido NORMAL antiguo sin metodoPago guardado en BD → preguntar
        Swal.fire({
          title: `Ticket pedido #${pedidoId}`,
          text: '¿Cómo se pagó este pedido?',
          icon: 'question',
          input: 'radio',
          inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
          inputValue: 'EFECTIVO',
          showCancelButton: true,
          confirmButtonText: 'Imprimir 🖨️',
          cancelButtonText: 'Cancelar',
          inputValidator: v => (!v ? 'Selecciona la forma de pago' : null)
        }).then(swRes => {
          if (swRes.isConfirmed) this.buildAndPrintTicket(d, item, swRes.value, null);
        });
      },
      error: err => {
        this.imprimiendoTicket[pedidoId] = false;
        Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el ticket.', icon: 'error' });
      }
    });
  }

  private formatearFechaTicket(d: PedidoDetalleResponse): string | undefined {
    const fecha = d.fechaHoraRegistro || d.fechaPedido;
    if (!fecha) return undefined;
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  private buildAndPrintTicket(d: PedidoDetalleResponse, item: IPedidoGenerico, metodoPago: string, montoDadoOrig: number | null): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const montoDado = metodoPago === 'EFECTIVO' && montoDadoOrig ? montoDadoOrig : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    imprimirTicket(generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || item.cliente.nombreCliente,
      metodoPago,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      // Historial completo con fecha por abono (queda vacío en una venta normal sin
      // abonos — no cambia nada ahí, ticket.util.ts solo lo usa si viene con datos).
      abonos:         (d.abonos ?? []).map(a => ({ monto: a.monto, fecha: a.fechaPago })),
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({
        cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal
      })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook,
      qrInstagram: this.qrInstagram,
      qrTiktok:  this.qrTiktok
    }));
  }

  enviarCorreoPedido(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;

    // Carga el detalle primero para conocer correo/método de pago registrados
    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }
        if (!this.puedeImprimir(d)) {
          Swal.fire({ icon: 'info', title: 'Todavía no hay ningún pago', text: 'Este pedido aún no se ha cobrado/recogido, o no tiene abonos registrados — no hay nada que enviar todavía.' });
          return;
        }
        const correoDefault = d.clienteCorreo || item.cliente.correoElectronico || '';

        if (correoDefault) {
          Swal.fire({
            title: `Enviar comprobante #${pedidoId}`,
            html: `¿Enviar el ticket al correo de <b>${MisPedidosComponent.escaparHtml(item.cliente.nombreCliente)}</b>:<br><b>${MisPedidosComponent.escaparHtml(correoDefault)}</b>?`,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Sí, enviar',
            denyButtonText: 'Usar otro correo',
            cancelButtonText: 'Cancelar'
          }).then(res => {
            if (res.isConfirmed) this.pedirMetodoYEnviar(pedidoId, item, d, correoDefault);
            else if (res.isDenied) this.pedirCorreoManualYEnviar(pedidoId, item, d);
          });
        } else {
          this.pedirCorreoManualYEnviar(pedidoId, item, d);
        }
      },
      error: err => Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el comprobante.', icon: 'error' })
    });
  }

  private pedirMetodoYEnviar(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse, correo: string): void {
    if (d.metodoPago) {
      this.enviarComprobanteConDatos(pedidoId, item, d, correo, d.metodoPago);
      return;
    }
    Swal.fire({
      title: 'Forma de pago',
      input: 'select',
      inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
      inputValue: 'EFECTIVO',
      showCancelButton: true,
      confirmButtonText: 'Enviar correo 📧',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) this.enviarComprobanteConDatos(pedidoId, item, d, correo, res.value);
    });
  }

  private pedirCorreoManualYEnviar(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse): void {
    const metodoPagoKnown = d.metodoPago ?? null;
    const selectHtml = metodoPagoKnown ? '' : `
      <select id="sw-metodo" class="swal2-select" style="margin-top:8px">
        <option value="EFECTIVO">Efectivo</option>
        <option value="TRANSFERENCIA">Transferencia</option>
        <option value="TARJETA">Tarjeta</option>
      </select>`;

    Swal.fire({
      title: `Enviar comprobante #${pedidoId}`,
      html: `<input id="sw-correo" type="email" class="swal2-input" placeholder="correo@ejemplo.com">${selectHtml}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar correo 📧',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const correo = (document.getElementById('sw-correo') as HTMLInputElement)?.value?.trim();
        if (!correo || !correo.includes('@')) { Swal.showValidationMessage('Ingresa un correo válido'); return false; }
        const metodo = metodoPagoKnown ?? (document.getElementById('sw-metodo') as HTMLSelectElement)?.value ?? 'EFECTIVO';
        return { correo, metodo };
      }
    }).then(swRes => {
      if (!swRes.isConfirmed || !swRes.value) return;
      const { correo, metodo } = swRes.value as { correo: string; metodo: string };
      this.enviarComprobanteConDatos(pedidoId, item, d, correo, metodo);
    });
  }

  private enviarComprobanteConDatos(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse, correo: string, metodo: string): void {
    const montoDado = metodo === 'EFECTIVO' && d.montoDado ? d.montoDado : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';

    const html = generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || item.cliente.nombreCliente,
      metodoPago:     metodo,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      abonos:         (d.abonos ?? []).map(a => ({ monto: a.monto, fecha: a.fechaPago })),
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook,
      qrInstagram: this.qrInstagram,
      qrTiktok:  this.qrTiktok
    });

    this.pedidoService.reenviarComprobante(pedidoId, { correo, ticketHtml: html }).subscribe({
      next: (res: any) => Swal.fire({
        title: '¡Correo enviado!',
        text: res?.data ?? `Comprobante enviado a ${correo}`,
        icon: 'success', timer: 2500, showConfirmButton: false
      }),
      error: err => Swal.fire({ title: 'Error al enviar correo', text: err?.error?.mensaje ?? 'No se pudo enviar el comprobante.', icon: 'error' })
    });
  }
}
