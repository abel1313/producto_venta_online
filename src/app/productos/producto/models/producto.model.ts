import { ICodigoBarra } from "./codigoBarras.model";
import { IdGenerico } from "./idGenerico.model";
import { IImagenDto } from "./imagen.dto.mode";
import { IProductoImagen } from "./productoImagen.model";



export interface IProducto extends IdGenerico{

    nombre: string;
    precioCosto: number;
    piezas: number;
    color: string;
    precioVenta: number;
    precioRebaja: number;
    descripcion: string;
    stock: number;
    marca: string;
    contenido: string;
    codigoBarras: ICodigoBarra;
    listImagenes: IImagenDto[];
}