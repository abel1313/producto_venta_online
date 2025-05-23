import { ICodigoBarra } from "./codigoBarras.model";
import { IdGenerico } from "./idGenerico.model";



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
}