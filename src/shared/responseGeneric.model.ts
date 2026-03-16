


export interface IResponseGeneric<T>{
    mensaje: string;
    codigo: number;
    response: T | null;
}