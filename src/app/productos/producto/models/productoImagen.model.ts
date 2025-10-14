import { IImagen } from "./imagen.model";
import { IProducto } from "./producto.model";



export interface IProductoImagen{


    producto: IProducto;
    imagen: IImagen;
}