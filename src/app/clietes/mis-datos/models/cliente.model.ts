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
    // true = nombre/apeidoPaterno/numeroTelefonico/correoElectronico ya están llenos (back:
    // `Cliente.recalcularDatosCompletos()`). El auto-alta al verificar el correo (registro) crea
    // el Cliente con id real pero estos campos vacíos y `datosCompletos=false` -- sin este check,
    // "el cliente existe" (id truthy) no es lo mismo que "el cliente puede comprar".
    datosCompletos?: boolean;
    // Preferencia de correos no transaccionales (seguimiento de pedido, alerta de stock de
    // favoritos) -- se cambia SOLO vía ClienteService.actualizarPreferenciaCorreo(), nunca por
    // guardarCliente()/saveData() (el back preserva el valor existente ahí a propósito).
    recibirCorreos?: boolean;
    // Checkbox independiente del de arriba -- se cambia SOLO vía
    // ClienteService.actualizarPreferenciaPromociones(), mismo criterio.
    recibirPromociones?: boolean;

}