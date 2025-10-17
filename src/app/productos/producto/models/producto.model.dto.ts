import { IImagenDto } from "./imagen.dto.mode";

export interface IProductoDTO{

    nombre:string;
    descripcion:string;
    stock: number;
    precioVenta: number;
    codigoBarras:string;
    cantidad: number;
    subTotal: number;
    idProducto: number;
    listImgs?: IImagenDto [];
}