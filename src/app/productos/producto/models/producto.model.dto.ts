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
    imagen:Imagen;
    listImgs?: IImagenDto[];
    marca?: string;
    color?: string;
}


export interface Imagen{
    id: number;
    nombreImagen: string;
    imagen: string;
    contentType: string;
}