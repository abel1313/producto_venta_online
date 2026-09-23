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
