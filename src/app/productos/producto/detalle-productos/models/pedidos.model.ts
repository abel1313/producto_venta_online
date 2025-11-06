
import { ICliente } from "src/app/clietes/mis-datos/models/index.model";
import { IdGenerico, IProducto } from "../../models";


export interface IPedidos extends IdGenerico{

    cliente: ICliente;
    fechaPedido: Date;
    estadoPedido: string;
    observaciones: string;
    detalles: IDetallePedidos[];
}


export interface IDetallePedidos extends IdGenerico{
    pedido: IPedidos;
    producto: IProducto;
    cantidad: number;
    precioUnitario: number;
    subTotal: number;
}


export interface IClienteDTOPedido extends IdGenerico{

}
export interface IProductoDTOPedidos extends IdGenerico{
}
export interface IPedidosDTOPedido extends IdGenerico{

    cliente: IClienteDTOPedido;
    fechaPedido: Date;
    estadoPedido: string;
    observaciones: string;
    detalles: IDetallePedidosDTOPedido[];
}


export interface IDetallePedidosDTOPedido extends IdGenerico{
    producto: IProductoDTOPedidos;
    cantidad: number;
    precioUnitario: number;
    subTotal: number;
}
