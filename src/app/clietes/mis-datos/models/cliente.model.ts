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
    correoVerificado?: boolean;
    // Correo nuevo escrito por el cliente, esperando el código de verificación (ver Cliente.java
    // en el back) -- el correoElectronico "real" no cambia hasta que se confirme.
    correoPendiente?: string;

}