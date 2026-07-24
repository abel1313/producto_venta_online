import { IDetalleQuery } from "./IDetallePedido.model";



export interface IPedidoQuery {
    id: number;
    fecha_pedido: string;
    estado_pedido: string;
    tipoPedido?: string;
    totalPagado?: number;
    // Datos de entrega (2026-07-24) — confirmado por el back que lugarEntregaId/Nombre y
    // urlFacebook ya vienen en este mismo objeto; nombreReceptor no está confirmado que
    // venga aquí todavía (solo en GET /{id}/detalle) — se deja opcional por si acaso.
    nombreReceptor?: string;
    lugarEntregaId?: number;
    lugarEntregaNombre?: string;
    urlFacebook?: string;
    detalles: IDetalleQuery[];
}