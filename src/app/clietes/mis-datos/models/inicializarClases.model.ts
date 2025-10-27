import { ICliente, IDireccion } from "./index.model";




export class InitCliente{

    public static initCliente(): ICliente{

        return {
            nombrePersona: '',
            apeidoMaterno: '',
            apeidoPaterno: '',
            correoElectronico: '',
            fechaNacimiento: null,
            numeroTelefonico: '',
            segundoNombre: '',
            sexo: '',
            usuario: {
                email: "",
                enabled: false,
                password: "",
                rol: "",
                username: ''
            },
           listDirecciones: [] 
        }
    }
}