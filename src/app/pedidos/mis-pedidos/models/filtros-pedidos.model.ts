import { IPageable } from './IPageable.mode';
import { IPedidoGenerico } from './IPedidoGenerico.model';

/**
 * Filtros de la lista de pedidos del administrador (back `GET /v1/pedidos/buscar`, dominio
 * busquedapedido, 2026-10-06). Los valores son los del back; los textos, los de la card.
 * Reglas R1–R13: `hexagonal/busquedapedido/README.md` en el back.
 */
/**
 * PENDIENTE (2026-10-07): el pedido que el cliente hizo desde su cuenta y nadie ha cobrado ni pasado
 * a Apartado / Ir pagando (en la base: NORMAL + estado 'Pendiente'). CONTADO ya no los incluye.
 */
export type FormaCobroFiltro = 'PENDIENTE' | 'CONTADO' | 'APARTADO' | 'IR_PAGANDO';
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
  /**
   * Qué significa la opción, en palabras del dueño. Sale al tocar el ⓘ del bloque
   * (`<app-ayuda-opciones>`), solo para los roles con Ayuda contextual. Textos fijos: si el dueño
   * pide cambiar uno, se cambia aquí (decidido 2026-10-07).
   */
  ayuda?: string;
}

export const OPCIONES_FORMA: IOpcionFiltro<FormaCobroFiltro>[] = [
  // Usa el mismo permiso que Contado: en la base los dos son NORMAL y antes salían juntos.
  { valor: 'PENDIENTE',  texto: '🕓 Pendiente',  accion: 'filtro-normal',
    ayuda: 'Lo pidió el cliente desde su cuenta y nadie lo ha cobrado ni apartado. Si tiene fecha para ' +
           'recoger y pasan 2 días sin que venga, se cancela solo. Si te pide que se lo apartes o que ' +
           'va a ir pagando, ábrelo y usa 🔁 Cambiar forma de cobro.' },
  { valor: 'CONTADO',    texto: '🛒 Contado',    accion: 'filtro-normal',
    ayuda: 'Se cobró completo de una vez (efectivo, tarjeta o transferencia). Puede faltar entregarlo.' },
  { valor: 'APARTADO',   texto: '📦 Apartado',   accion: 'filtro-apartado',
    ayuda: 'El cliente lo pidió y no ha dado dinero. Paga todo al recogerlo. Si deja un adelanto, ' +
           'pásalo a Ir pagando.' },
  { valor: 'IR_PAGANDO', texto: '💳 Ir pagando', accion: 'filtro-fiado',
    ayuda: 'El cliente ya dio dinero y va abonando. Los abonos no caducan y nunca es a meses sin intereses.' }
];

export const OPCIONES_ESTADO_PAGO: IOpcionFiltro<EstadoFiltro>[] = [
  { valor: 'FALTA_PAGAR', texto: '💰 Falta pagar', accion: 'filtro-por-cobrar',
    ayuda: 'Todavía debe algo: los Pendientes, y los Apartados e Ir pagando que no se han liquidado.' },
  { valor: 'PAGADO',      texto: '✅ Pagado',      accion: 'filtro-pagados',
    ayuda: 'Ya se cobró todo. Combínalo con "Falta entregar" para ver lo pagado que el cliente no se ha llevado.' },
  { valor: 'CANCELADO',   texto: '❌ Cancelado',   accion: 'filtro-cancelados',
    ayuda: 'Se canceló, a mano o solo (un Pendiente que no se recogió a tiempo).' }
];

export const OPCIONES_ESTADO_ENTREGA: IOpcionFiltro<EstadoFiltro>[] = [
  { valor: 'FALTA_ENTREGAR', texto: '📦 Falta entregar', accion: 'filtro-pendientes',
    ayuda: 'El cliente todavía no se lo lleva, esté pagado o no.' },
  { valor: 'ENTREGADO',      texto: '🤝 Entregado',      accion: 'filtro-entregados',
    ayuda: 'El cliente ya se lo llevó.' }
];

/** Las dos juntas: para leer los filtros guardados y armar el resumen. */
export const OPCIONES_ESTADO: IOpcionFiltro<EstadoFiltro>[] = [...OPCIONES_ESTADO_PAGO, ...OPCIONES_ESTADO_ENTREGA];

/** Nombres de antes del 2026-10-06 en filtros guardados. */
export const ESTADOS_ANTERIORES: Record<string, EstadoFiltro> = { PENDIENTE: 'FALTA_PAGAR', POR_COBRAR: 'FALTA_PAGAR' };

export const OPCIONES_DINERO: IOpcionFiltro<DineroFiltro>[] = [
  { valor: 'CON_SALDO',     texto: '💰 Debe dinero',    accion: 'filtro-dinero',
    ayuda: 'Apartado o Ir pagando que todavía debe algo.' },
  { valor: 'SIN_ABONOS',    texto: '🚫 Sin abonos',     accion: 'filtro-dinero',
    ayuda: 'Apartado o Ir pagando sin ningún abono todavía.' },
  { valor: 'SALDO_A_FAVOR', texto: '↩️ Saldo a favor', accion: 'filtro-dinero',
    ayuda: 'Hay que devolverle dinero al cliente: pagó más de lo que vale el pedido (se le quitó un ' +
           'artículo) o se canceló con dinero dado.' }
];

export const OPCIONES_ENTREGA: IOpcionFiltro<EntregaFiltro>[] = [
  { valor: 'HOY',         texto: '📅 Hoy',        accion: 'filtro-fecha-entrega',
    ayuda: 'Los que faltan por entregar con fecha de entrega o de recogida hoy.' },
  { valor: 'MANANA',      texto: 'Mañana',        accion: 'filtro-fecha-entrega',
    ayuda: 'Los que faltan por entregar con fecha mañana.' },
  { valor: 'ESTA_SEMANA', texto: 'Esta semana',   accion: 'filtro-fecha-entrega',
    ayuda: 'Los que faltan por entregar con fecha de hoy a 6 días.' },
  { valor: 'ATRASADOS',   texto: '⚠ Atrasados',   accion: 'filtro-fecha-entrega',
    ayuda: 'Su fecha ya pasó y todavía no se entregan.' }
];

export const OPCIONES_MODO: IOpcionFiltro<ModoEntregaFiltro>[] = [
  { valor: 'RECOGE_EN_TIENDA', texto: '🏪 Recoge en tienda', accion: 'filtro-lugar',
    ayuda: 'Eligieron la fila del local (🏬 Recoger en tienda) o no eligieron lugar.' },
  { valor: 'ENVIO',            texto: '🚚 Envío',            accion: 'filtro-lugar',
    ayuda: 'Eligieron una zona de Envíos → Zonas de entrega (Tejupilco, Zacazonapan…).' }
];

export const OPCIONES_UNIDOS: IOpcionFiltro<UnidosFiltro>[] = [
  { valor: 'SOLO_UNIDOS', texto: '🔗 Solo unidos', accion: 'filtro-unidos-otros',
    ayuda: 'Pedidos unidos en un grupo: el dinero es del grupo y se cobran juntos.' },
  { valor: 'SIN_UNIR',    texto: 'Sin unir',      accion: 'filtro-unidos-otros',
    ayuda: 'Pedidos que no están unidos con otros.' }
];

export const OPCIONES_ORDEN: IOpcionFiltro<OrdenPedidos>[] = [
  { valor: 'RECIENTES',       texto: 'Más recientes primero' },
  { valor: 'ANTIGUOS',        texto: 'Más antiguos primero' },
  { valor: 'ENTREGA_PROXIMA', texto: 'Entrega más próxima' },
  { valor: 'MAYOR_SALDO',     texto: 'Los que más deben' }
];
