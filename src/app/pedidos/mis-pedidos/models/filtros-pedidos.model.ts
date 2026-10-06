import { IPageable } from './IPageable.mode';
import { IPedidoGenerico } from './IPedidoGenerico.model';

/**
 * Filtros de la lista de pedidos del administrador (back `GET /v1/pedidos/buscar`, dominio
 * busquedapedido, 2026-10-06). Los valores son los del back; los textos, los de la card.
 * Reglas R1–R13: `hexagonal/busquedapedido/README.md` en el back.
 */
export type FormaCobroFiltro = 'CONTADO' | 'APARTADO' | 'IR_PAGANDO';
export type EstadoFiltro     = 'PENDIENTE' | 'POR_COBRAR' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO';
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
   * Acción de Gestión de roles que hace falta para ver la opción. Solo las 5 que ya existían
   * (filtro-normal, -apartado, -fiado, -pagados, -cancelados); las nuevas las ve todo el que
   * entra a la lista, que ya es solo administrador.
   */
  accion?: string;
}

export const OPCIONES_FORMA: IOpcionFiltro<FormaCobroFiltro>[] = [
  { valor: 'CONTADO',    texto: '🛒 Contado',    accion: 'filtro-normal' },
  { valor: 'APARTADO',   texto: '📦 Apartado',   accion: 'filtro-apartado' },
  { valor: 'IR_PAGANDO', texto: '💳 Ir pagando', accion: 'filtro-fiado' }
];

export const OPCIONES_ESTADO: IOpcionFiltro<EstadoFiltro>[] = [
  { valor: 'PENDIENTE',  texto: '⏳ Pendiente' },
  { valor: 'POR_COBRAR', texto: '🕒 Por cobrar' },
  { valor: 'PAGADO',     texto: '✅ Pagado',    accion: 'filtro-pagados' },
  { valor: 'ENTREGADO',  texto: '🤝 Entregado' },
  { valor: 'CANCELADO',  texto: '❌ Cancelado', accion: 'filtro-cancelados' }
];

export const OPCIONES_DINERO: IOpcionFiltro<DineroFiltro>[] = [
  { valor: 'CON_SALDO',     texto: '💰 Debe dinero' },
  { valor: 'SIN_ABONOS',    texto: '🚫 Sin abonos' },
  { valor: 'SALDO_A_FAVOR', texto: '↩️ Saldo a favor' }
];

export const OPCIONES_ENTREGA: IOpcionFiltro<EntregaFiltro>[] = [
  { valor: 'HOY',         texto: '📅 Hoy' },
  { valor: 'MANANA',      texto: 'Mañana' },
  { valor: 'ESTA_SEMANA', texto: 'Esta semana' },
  { valor: 'ATRASADOS',   texto: '⚠ Atrasados' }
];

export const OPCIONES_MODO: IOpcionFiltro<ModoEntregaFiltro>[] = [
  { valor: 'RECOGE_EN_TIENDA', texto: '🏪 Recoge en tienda' },
  { valor: 'ENVIO',            texto: '🚚 Envío' }
];

export const OPCIONES_UNIDOS: IOpcionFiltro<UnidosFiltro>[] = [
  { valor: 'SOLO_UNIDOS', texto: '🔗 Solo unidos' },
  { valor: 'SIN_UNIR',    texto: 'Sin unir' }
];

export const OPCIONES_ORDEN: IOpcionFiltro<OrdenPedidos>[] = [
  { valor: 'RECIENTES',       texto: 'Más recientes primero' },
  { valor: 'ANTIGUOS',        texto: 'Más antiguos primero' },
  { valor: 'ENTREGA_PROXIMA', texto: 'Entrega más próxima' },
  { valor: 'MAYOR_SALDO',     texto: 'Los que más deben' }
];
