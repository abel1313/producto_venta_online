export interface IPedidoVarianteDetalleDTO {
  producto: { id: number };
  cantidad: number;
  precioUnitario: number;
  subTotal: number;
  varianteId: number;
  promocionId?: number;
}

export interface IPedidoVarianteDTO {
  cliente: { id: number };
  tipoPedido?: 'NORMAL' | 'APARTADO' | 'FIADO';
  estadoPedido: string;
  fechaPedido: string;
  //fechaRecogida: string;
  observaciones: string;
  lugarEntregaId?: number;
  // Ubicación exacta de la casa del cliente (2026-08-22) — distinto de lugarEntregaId, que
  // es la zona/pueblo. Se captura con el mapa al elegir zona, opcional.
  latitud?: number;
  longitud?: number;
  referencias?: string;
  detalles: IPedidoVarianteDetalleDTO[];
}
