
import { ICliente } from "src/app/clietes/mis-datos/models/index.model";
import { IdGenerico, IProducto } from "../../models";

export interface IClienteBusquedaDto {
  id: number;
  nombrePersona: string;
  apeidoPaterno: string;
  apeidoMaterno: string;
  correoElectronico: string;
  numeroTelefonico: string;
}

export interface IPageableClientes {
  list: IClienteBusquedaDto[];
  totalPaginas: number;
  totalElementos: number;
  pagina: number;
}


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
    fechaRecogida: Date | null;
    estadoPedido: string;
    observaciones: string;
    detalles: IDetallePedidosDTOPedido[];
}


export interface IDetallePedidosDTOPedido extends IdGenerico{
    producto: IProductoDTOPedidos;
    cantidad: number;
    precioUnitario: number;
    subTotal: number;
    varianteId?: number | null;
}
