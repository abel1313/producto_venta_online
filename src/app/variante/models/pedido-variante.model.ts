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
  // Solo aplica cuando el lugar elegido es "recoger en tienda" (LugarEntrega.esRecogerEnTienda) —
  // opcional, si no se manda el back la deja en hoy+3 días. Para una zona de entrega real se deja
  // sin mandar, el back la ignora y queda null (la coordina el admin después).
  fechaRecogida?: string;
  observaciones: string;
  lugarEntregaId?: number;
  // Ubicación exacta de la casa del cliente (2026-08-22) — distinto de lugarEntregaId, que
  // es la zona/pueblo. Se captura con el mapa al elegir zona, opcional.
  latitud?: number;
  longitud?: number;
  referencias?: string;
  detalles: IPedidoVarianteDetalleDTO[];
}
