import { IClienteQuery } from "./IClienteQuery.model";
import { IPedidoQuery } from "./IPedidoQuery.model";


export interface IPedidoGenerico{
    cliente: IClienteQuery;
    pedido: IPedidoQuery;
}