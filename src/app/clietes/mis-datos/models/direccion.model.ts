import { IdGenerico } from "src/app/productos/producto/models";



export interface IDireccion extends IdGenerico {

    calle: string;
    colonia: string;
    codigoPostal: number;
    municipio: string;
    referencias: string;
    predefinida: boolean;
}