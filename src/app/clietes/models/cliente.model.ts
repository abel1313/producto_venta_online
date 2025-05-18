import { IdGenerico } from "src/app/productos/producto/models";



export interface ICliente extends IdGenerico{
  nombrePersona: string;
  segundoNombre: string;
  apeidoPaterno: string;
  apeidoMaterno: string;
  fechaNacimiento?: Date;
  sexo: string;
  correoElectronico: string;
  numeroTelefonico: string;
}