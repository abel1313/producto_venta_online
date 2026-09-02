


export interface IUsuarioDto{

    id?: number;
    username: string;
    password?: string;
    email: string;
    rol: string;
    enabled: boolean;
    // Solo lectura -- se acepta una vez en el registro, nunca se edita desde "Actualizar usuario".
    aceptoPrivacidad?: boolean;
    fechaAceptoPrivacidad?: string;
}