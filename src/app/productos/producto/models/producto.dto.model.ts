import { ICodigoBarra } from "./codigoBarras.model";
import { IdGenerico } from "./idGenerico.model";



export interface IProductoDTORec extends IdGenerico{

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
    // Palabra clave asignada — para precargar el autocomplete al editar
    palabraClave?: { id: number; nombre: string } | null;
}


export interface IProductoDTOImagenes{

    idProducto: number;
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