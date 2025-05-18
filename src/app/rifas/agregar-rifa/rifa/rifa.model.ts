import { ICliente } from "src/app/clietes/models";
import { IdGenerico } from "src/app/productos/producto/models";



export interface IRifa extends IdGenerico{
    cliente: ICliente;
}