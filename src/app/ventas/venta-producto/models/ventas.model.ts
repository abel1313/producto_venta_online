import { IdGenerico } from "src/app/productos/producto/models";
import { IUsuario } from "./usuario.model";




export interface IVenta extends IdGenerico{

    usuario: IUsuario;
    totalVenta: number;

}