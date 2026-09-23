import { IDetalleQuery } from "./IDetallePedido.model";
import { GrupoEnLista } from "../../models/grupo-pedido.model";



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
    /** Solo en la lista del admin, y solo si está unido con otros (back 2026-09-23). */
    grupo?: GrupoEnLista | null;
}