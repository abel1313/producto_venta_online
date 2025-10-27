
export class ResponseGeneric<T> {

    mensaje: string;
    code: number;
    data: T | null;
    lista: T[];

    constructor(){
        this.mensaje = '';
        this.code = 0;
        this.data = null;
        this.lista = [];
    }
}