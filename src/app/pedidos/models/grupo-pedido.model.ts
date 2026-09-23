/**
 * Unir pedidos (back 2026-09-23, `/v1/grupos-pedido`). Contrato en `CAMBIOS_FRONT.md`.
 *
 * Los pedidos no se fusionan: el grupo solo los junta para cobrarlos y recogerlos juntos. Cada uno
 * conserva sus artículos, su cliente y sus abonos, y deshacer no mueve dinero.
 */

export interface PedidoDelGrupo {
  pedidoId:     number;
  cliente:      string;
  tipoPedido:   string;
  estadoPedido: string;
  total:        number;
  pagado:       number;
  saldo:        number;
  esTitular:    boolean;
}

export interface GrupoPedidos {
  grupoId:         number;
  activo:          boolean;
  pedidoTitularId: number;
  titularNombre:   string | null;
  tipoPedido:      string | null;
  fechaCreacion:   string;
  nota:            string | null;
  totalGrupo:      number;
  pagadoGrupo:     number;
  saldoGrupo:      number;
  pedidos:         PedidoDelGrupo[];
}

/** `POST /v1/grupos-pedido` */
export interface UnirPedidosRequest {
  pedidoIds:       number[];
  pedidoTitularId: number;
  nota?:           string;
}

/** `POST /v1/grupos-pedido/{id}/abonos` */
export interface AbonoGrupoRequest {
  monto:       number;
  metodoPago:  'EFECTIVO' | 'TRANSFERENCIA';
  montoDado?:  number;
  nota?:       string;
}

export interface AbonoGrupoResponse {
  grupo:    GrupoPedidos;
  /** Cuánto le tocó a cada pedido, del más viejo al más nuevo. */
  repartos: { pedidoId: number; monto: number; liquida: boolean }[];
  cambio:   number;
}

/** `data` del 400 cuando los pedidos no tienen la misma forma de cobro. */
export interface TipoPorPedido {
  pedidoId:   number;
  tipoPedido: string;
}

/**
 * `pedido.grupo` en la lista de pedidos del admin. Solo viene si el pedido está en un grupo activo.
 *
 * De un grupo solo sale en la lista la card del titular; los demás se abren buscando su número.
 */
export interface GrupoEnLista {
  grupoId:         number;
  pedidoTitularId: number;
  /** Si esta card es la del titular. */
  esTitular:       boolean;
  titularNombre:   string | null;
  tipoPedido:      string | null;
  /** Los demás pedidos del grupo, sin este. */
  otrosPedidos:    number[];
  totalGrupo:      number;
  pagadoGrupo:     number;
  /** Lo que falta cobrar entre todos. En un grupo de contado es lo que cobra "Cobrar". */
  saldoGrupo:      number;
}

/** `POST /v1/grupos-pedido/{id}/cobrar-contado` */
export interface CobroContadoResponse {
  grupo:           GrupoPedidos;
  /** Los que se confirmaron, del más viejo al más nuevo. Los ya entregados no vienen. */
  pedidosCobrados: number[];
}

/** `POST /v1/grupos-pedido/{id}/separar` */
export interface SepararRequest {
  /** Los que se separan; todos = separar el grupo entero. */
  pedidosQueSalen: number[];
  /** Cuánto de lo abonado se queda cada pedido que sale. Solo a crédito; tiene que cuadrar exacto. */
  reparto?:        { pedidoId: number; monto: number }[];
  /** Quién recoge a los que siguen unidos. Obligatorio si el que recogía se separa. */
  nuevoTitularId?: number;
  motivo?:         string;
}

export interface SeparacionResponse {
  /** El grupo ya separado, con cómo quedó cada pedido (pagado, saldo, estado). */
  grupo:        GrupoPedidos;
  /** El grupo en el que siguen unidos los demás, o null. */
  grupoNuevoId: number | null;
}
