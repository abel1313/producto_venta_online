import { IPageable } from './IPageable.mode';
import { IPedidoGenerico } from './IPedidoGenerico.model';

/**
 * Filtros de la lista de pedidos del administrador (back `GET /v1/pedidos/buscar`, dominio
 * busquedapedido, 2026-10-06). Los valores son los del back; los textos, los de la card.
 * Reglas R1–R13: `hexagonal/busquedapedido/README.md` en el back.
 */
export type FormaCobroFiltro = 'CONTADO' | 'APARTADO' | 'IR_PAGANDO';
/**
 * Pago y entrega (back 2026-10-06): dentro de cada bloque se suman, entre bloques se cruzan
 * ("Pagado" + "Falta entregar" = ya pagó y no se lo ha llevado). PENDIENTE y POR_COBRAR son los
 * nombres de antes; el back los acepta como FALTA_PAGAR y aquí se convierten al leer los guardados.
 */
export type EstadoFiltro     = 'FALTA_PAGAR' | 'PAGADO' | 'CANCELADO' | 'FALTA_ENTREGAR' | 'ENTREGADO';
export type DineroFiltro     = 'CON_SALDO' | 'SIN_ABONOS' | 'SALDO_A_FAVOR';
export type EntregaFiltro    = 'HOY' | 'MANANA' | 'ESTA_SEMANA' | 'ATRASADOS';
export type ModoEntregaFiltro = 'RECOGE_EN_TIENDA' | 'ENVIO';
export type UnidosFiltro     = 'SOLO_UNIDOS' | 'SIN_UNIR';
export type OrdenPedidos     = 'RECIENTES' | 'ANTIGUOS' | 'ENTREGA_PROXIMA' | 'MAYOR_SALDO';

export interface IFiltrosPedidos {
  formas: FormaCobroFiltro[];
  estados: EstadoFiltro[];
  dinero: DineroFiltro[];
  totalDesde: number | null;
  totalHasta: number | null;
  /** yyyy-mm-dd */
  registroDesde: string;
  registroHasta: string;
  entrega: EntregaFiltro | null;
  lugarEntregaId: number | null;
  /** Solo para volver a pintar el lugar elegido al cargar los filtros guardados. */
  lugarNombre: string;
  modoEntrega: ModoEntregaFiltro | null;
  unidos: UnidosFiltro | null;
  soloRamos: boolean;
  soloConPromocion: boolean;
  orden: OrdenPedidos;
}

export function filtrosPedidosVacios(): IFiltrosPedidos {
  return {
    formas: [], estados: [], dinero: [],
    totalDesde: null, totalHasta: null,
    registroDesde: '', registroHasta: '',
    entrega: null, lugarEntregaId: null, lugarNombre: '', modoEntrega: null, unidos: null,
    soloRamos: false, soloConPromocion: false,
    orden: 'RECIENTES'
  };
}

/** Lo que manda el back: lo de siempre (`list`, `totalPaginas`) más el total de pedidos. */
export interface IPedidosEncontrados extends IPageable<IPedidoGenerico[]> {
  totalRegistros: number;
  pagina: number;
}

export interface IOpcionFiltro<T> {
  valor: T;
  texto: string;
  /**
   * Acción de Gestión de roles que hace falta para ver la opción (Mis pedidos → Filtros). Forma
   * de cobro y Estado van opción por opción; los demás bloques, una acción por bloque. Se dieron
   * de alta en migration_accion_pedidos_filtros_y_cobro.sql (2026-10-06).
   */
  accion?: string;
}

export const OPCIONES_FORMA: IOpcionFiltro<FormaCobroFiltro>[] = [
  { valor: 'CONTADO',    texto: '🛒 Contado',    accion: 'filtro-normal' },
  { valor: 'APARTADO',   texto: '📦 Apartado',   accion: 'filtro-apartado' },
  { valor: 'IR_PAGANDO', texto: '💳 Ir pagando', accion: 'filtro-fiado' }
];

export const OPCIONES_ESTADO_PAGO: IOpcionFiltro<EstadoFiltro>[] = [
  { valor: 'FALTA_PAGAR', texto: '💰 Falta pagar', accion: 'filtro-por-cobrar' },
  { valor: 'PAGADO',      texto: '✅ Pagado',      accion: 'filtro-pagados' },
  { valor: 'CANCELADO',   texto: '❌ Cancelado',   accion: 'filtro-cancelados' }
];

export const OPCIONES_ESTADO_ENTREGA: IOpcionFiltro<EstadoFiltro>[] = [
  { valor: 'FALTA_ENTREGAR', texto: '📦 Falta entregar', accion: 'filtro-pendientes' },
  { valor: 'ENTREGADO',      texto: '🤝 Entregado',      accion: 'filtro-entregados' }
];

/** Las dos juntas: para leer los filtros guardados y armar el resumen. */
export const OPCIONES_ESTADO: IOpcionFiltro<EstadoFiltro>[] = [...OPCIONES_ESTADO_PAGO, ...OPCIONES_ESTADO_ENTREGA];

/** Nombres de antes del 2026-10-06 en filtros guardados. */
export const ESTADOS_ANTERIORES: Record<string, EstadoFiltro> = { PENDIENTE: 'FALTA_PAGAR', POR_COBRAR: 'FALTA_PAGAR' };

export const OPCIONES_DINERO: IOpcionFiltro<DineroFiltro>[] = [
  { valor: 'CON_SALDO',     texto: '💰 Debe dinero',    accion: 'filtro-dinero' },
  { valor: 'SIN_ABONOS',    texto: '🚫 Sin abonos',     accion: 'filtro-dinero' },
  { valor: 'SALDO_A_FAVOR', texto: '↩️ Saldo a favor', accion: 'filtro-dinero' }
];

export const OPCIONES_ENTREGA: IOpcionFiltro<EntregaFiltro>[] = [
  { valor: 'HOY',         texto: '📅 Hoy',        accion: 'filtro-fecha-entrega' },
  { valor: 'MANANA',      texto: 'Mañana',        accion: 'filtro-fecha-entrega' },
  { valor: 'ESTA_SEMANA', texto: 'Esta semana',   accion: 'filtro-fecha-entrega' },
  { valor: 'ATRASADOS',   texto: '⚠ Atrasados',   accion: 'filtro-fecha-entrega' }
];

export const OPCIONES_MODO: IOpcionFiltro<ModoEntregaFiltro>[] = [
  { valor: 'RECOGE_EN_TIENDA', texto: '🏪 Recoge en tienda', accion: 'filtro-lugar' },
  { valor: 'ENVIO',            texto: '🚚 Envío',            accion: 'filtro-lugar' }
];

export const OPCIONES_UNIDOS: IOpcionFiltro<UnidosFiltro>[] = [
  { valor: 'SOLO_UNIDOS', texto: '🔗 Solo unidos', accion: 'filtro-unidos-otros' },
  { valor: 'SIN_UNIR',    texto: 'Sin unir',      accion: 'filtro-unidos-otros' }
];

export const OPCIONES_ORDEN: IOpcionFiltro<OrdenPedidos>[] = [
  { valor: 'RECIENTES',       texto: 'Más recientes primero' },
  { valor: 'ANTIGUOS',        texto: 'Más antiguos primero' },
  { valor: 'ENTREGA_PROXIMA', texto: 'Entrega más próxima' },
  { valor: 'MAYOR_SALDO',     texto: 'Los que más deben' }
];
