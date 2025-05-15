import { IdGenerico } from "src/app/productos/producto/models";


export interface IGastos extends IdGenerico{

    descripcionGasto: string;
    precioGasto: number;
}