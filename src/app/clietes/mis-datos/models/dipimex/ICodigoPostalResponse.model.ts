import { ICodigoPostal } from "./ICodigoPostal.model";



export interface ICodigoPostalResponse {
    error: boolean;
    message: string;
    codigo_postal: ICodigoPostal;
}