import { IDetalleVenta } from './detalleVenta.mode';

export interface IVentaDirectaRequest {
  usuarioId: number;
  pagosYMesesId: number;
  detalles: IDetalleVenta[];
}
