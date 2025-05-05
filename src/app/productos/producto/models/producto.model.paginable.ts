



export interface IProductoPaginable<T>{

    pagina: number;
    totalPaginas: number;
    totalRegistros: number;
    t: T;
}