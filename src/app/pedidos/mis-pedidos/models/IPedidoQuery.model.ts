import { IDetalleQuery } from "./IDetallePedido.model";



export interface IPedidoQuery {
    id: number;
    fecha_pedido: string;
    estado_pedido: string;
    tipoPedido?: string;
    detalles: IDetalleQuery[];
}