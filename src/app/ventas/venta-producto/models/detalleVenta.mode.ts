import { IdGenerico, IProductoDTO } from "src/app/productos/producto/models";


export interface IDetalleVenta extends IdGenerico{


    
    nombre:string;
    descripcion:string;
    stock: number;
    precioVenta: number;
    codigoBarras:string;
    cantidad: number;
    subTotal: number;
    
    

}