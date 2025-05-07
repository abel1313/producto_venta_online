import { IdGenerico } from "src/app/productos/producto/models";



export interface IUsuario extends IdGenerico{

    nombre:string;
    password?: string;
}