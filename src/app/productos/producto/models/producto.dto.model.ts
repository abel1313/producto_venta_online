import { ICodigoBarra } from "./codigoBarras.model";
import { IdGenerico } from "./idGenerico.model";



export interface IProductoDTORec extends IdGenerico{

    // En runtime este objeto viene del item de la grilla (IProductoDTO), que
    // usa `idProducto` — no `id` — como llave. Se declara aquí para poder
    // leerlo con tipos en AddComponent al armar el body de /productos/save
    // (el back ahora matchea por id cuando se lo mandas — ver CAMBIOS_FRONT.md
    // "Bug corregido: editar un producto normal... creaba un duplicado").
    idProducto?: number;
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
    palabraClave?: { id: number; nombre: string } | null;
    imagenPrincipalId?: string | null;
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