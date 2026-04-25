export interface ITipoPago {
  id: number;
  formaPago: string;
}

export interface ITarifaTerminal {
  id: number;
  tarifa: number;
  descripcion: string;
}

export interface IIvaTerminal {
  id: number;
  iva: number;
  descripcion: string;
}

export interface IDetallePago {
  id: { tipoPagoId: number; tarifaTerminalId: number; ivaId: number };
  tipoPago: ITipoPago;
  tarifaTerminal: ITarifaTerminal;
  ivaTerminal: IIvaTerminal;
}

export interface IMesesIntereses {
  id: number;
  meses: string;
  descripcion: string;
  ivaTerminal: IIvaTerminal;
  tarifaTerminal: ITarifaTerminal;
}

export interface IPagosYMeses {
  id: number;
  tipoPago: ITipoPago;
  mesesIntereses: IMesesIntereses;
}

export interface IOpcionMesesDto {
  pagosYMesesId: number;
  descripcion: string;
  cuotas: number;
}

export interface IOpcionPagoDto {
  tipoPagoId: number;
  formaPago: string;
  mostrarMeses: boolean;
  pagosYMesesId: number;
  requiereTerminal: boolean;
  opciones: IOpcionMesesDto[];
}

export type MpEstado = 'OPEN' | 'FINISHED' | 'CANCELED';

export interface IHistorialMpItem {
  id?: number;
  intentId: string;
  estado: MpEstado;
  pedidoId: number;
  clienteId?: number;
  cuotas?: number;
  monto?: number;
  descripcion?: string;
  fechaCreacion?: string;
  fechaUpdate?: string;
}

export interface IHistorialMpPage {
  content: IHistorialMpItem[];
  totalPages: number;
}

export interface IHistorialMpMpItem {
  paymentIntentId: string;
  status: string;
  createdOn?: string;
}

export interface ITerminalIniciarRequest {
  pedidoId: number;
  clienteId: number;
  pagosYMesesId: number;
  cuotas: number;
  totalMonto: number;
  descripcion: string;
}

export interface ITerminalIniciarResponse {
  intentId: string;
  estado: string;
  mensaje: string;
}

export interface ITerminalEstadoResponse {
  intentId: string;
  estado: 'OPEN' | 'FINISHED' | 'CANCELED';
  pedidoId?: number;
}
