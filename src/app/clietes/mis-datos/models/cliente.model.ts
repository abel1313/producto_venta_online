import { IUsuarioDto } from './../../../usuarios/usuarios/models/usuario.dto';
import { IDireccion } from './index.model';
import { IdGenerico } from "src/app/productos/producto/models";


export interface ICliente extends IdGenerico {


    nombrePersona: string;
    segundoNombre: string;
    apeidoPaterno: string;
    apeidoMaterno: string;
    fechaNacimiento: Date | null;
    sexo: string;
    correoElectronico: string;
    numeroTelefonico: string;
    usuario: IUsuarioDto;
    listDirecciones: IDireccion [];

}