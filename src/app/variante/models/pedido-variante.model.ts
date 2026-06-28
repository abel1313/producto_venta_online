export interface IPedidoVarianteDetalleDTO {
  producto: { id: number };
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
  varianteId: number;
}

export interface IPedidoVarianteDTO {
  cliente: { id: number };
  tipoPedido?: 'NORMAL' | 'APARTADO' | 'FIADO';
  estadoPedido: string;
  fechaPedido: string;
  //fechaRecogida: string;
  observaciones: string;
  detalles: IPedidoVarianteDetalleDTO[];
}
