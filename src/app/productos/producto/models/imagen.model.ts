import { IdGenerico } from "./idGenerico.model";
import { IProductoImagen } from "./productoImagen.model";

export interface IImagen extends IdGenerico{

    base64:string;
    extension: string;
    nombreImagen: string;
    listProductoImanen: IProductoImagen[];
}