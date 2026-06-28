export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
export type TipoPedidoAbono = 'APARTADO' | 'FIADO' | 'NORMAL';

export interface AbonoRequest {
  monto: number;
  fechaPago?: string;
  metodoPago?: MetodoPago;
  nota?: string;
}

export interface AbonoResponse {
  id: number;
  monto: number;
  fechaPago: string;
  metodoPago: string;
  nota: string | null;
}

export interface EstadoCuenta {
  pedidoId: number;
  tipoPedido: string;
  estadoPedido: string;
  cliente: string;
  telefono: string;
  totalPedido: number;
  totalPagado: number;
  saldo: number;
  fechaPedido: string;
  abonos: AbonoResponse[];
}

export interface PedidoPagado {
  pedidoId: number;
  tipoPedido: string;
  cliente: string;
  telefono: string;
  totalPedido: number;
  fechaPedido: string;
  fechaUltimoPago: string;
  abonos: AbonoResponse[];
}
