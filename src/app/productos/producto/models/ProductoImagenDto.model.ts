import { ImagenUpdateDto } from './ImagenUpdateDto.model';



export interface ProductoImagenDto{
    productoId: number;
    listaImagenes: ImagenUpdateDto [];
}