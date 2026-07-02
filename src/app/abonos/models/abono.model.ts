export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
export type TipoPedidoAbono = 'APARTADO' | 'FIADO' | 'NORMAL';

export interface INotificacionRequest {
  enviarCorreo?:   boolean;
  enviarWhatsapp?: boolean;
  correo?:         string;
  ticketHtml?:     string;
  ticketTexto?:    string;
}

export interface AbonoRequest {
  monto:          number;
  usuarioId?:     number;
  fechaPago?:     string;
  metodoPago?:    MetodoPago;
  nota?:          string;
  montoDado?:     number;
  notificacion?:  INotificacionRequest;
}

export interface AbonoResponse {
  id:               number;
  monto:            number;
  fechaPago:        string;
  metodoPago:       string;
  nota:             string | null;
  // Solo presentes en POST (registrar abono); ausentes en GET (historial)
  estadoPedido?:    string | null;
  saldoRestante?:   number | null;
  correoEnviado?:   boolean;
  whatsappEnviado?: boolean;
  erroresEnvio?:    string[];
}

export interface AbonoDetalleItem {
  id:         number;
  monto:      number;
  fechaPago:  string;
  metodoPago: string;
  nota:       string | null;
  montoDado:  number | null;
}

export interface PedidoDetalleResponse {
  pedidoId:        number;
  tipoPedido:      string;
  estadoPedido:    string;
  totalPedido:     number;
  totalPagado:     number;
  saldoPendiente:  number;
  fechaPedido:     string;
  clienteNombre:   string;
  clienteTelefono: string;
  clienteCorreo?:  string | null;
  metodoPago?:     string | null;
  montoDado?:      number | null;
  abonos?:         AbonoDetalleItem[];
  detalles:        PedidoDetalleItem[];
}

export interface PedidoDetalleItem {
  varianteId:     number;
  productoNombre: string;
  talla:          string | null;
  color:          string | null;
  cantidad:       number;
  precioUnitario: number;
  subTotal:       number;
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

export interface CancelarAbonoRequest {
  motivo?:       string;
  notificacion?: INotificacionRequest;
}

export interface CancelarAbonoResponse {
  pedidoId: number;
  tipoPedido: string;
  estadoPedido: string;
  totalPagado: number;
  totalPendiente: number;
  stockDevuelto: boolean;
  mensaje: string;
}

export interface TransferirAbonoRequest {
  nuevaVarianteId: number;
  cantidad: number;
  precioUnitario: number;
  usuarioId: number;
}

export interface TransferirAbonoResponse {
  nuevoPedidoId: number;
  totalNuevo: number;
  montoTransferido: number;
  saldoPendiente: number;
  estadoNuevoPedido: string;
  mensaje: string;
}

export interface ReporteCancelado {
  pedidoId: number;
  tipoPedido: string;
  cliente: string;
  telefono: string;
  totalPedido: number;
  totalPagado: number;
  saldoAFavor: number;
  deudaPendiente: number;
  motivo: string | null;
  fechaPedido: string;
  fechaCancelacion: string | null;
  puedeTransferir: boolean;
  abonos: AbonoResponse[];
}
