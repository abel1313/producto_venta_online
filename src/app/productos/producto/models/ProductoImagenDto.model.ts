import { ImagenUpdateDto } from './ImagenUpdateDto.model';

export interface ProductoImagenDto {
    productoId:    number;
    listaImagenes: ImagenUpdateDto[];
}

export interface ProductoImagenPaginadaDto {
    productoId:    number;
    listaImagenes: ImagenUpdateDto[];
    pagina:        number;
    totalPaginas:  number;
    totalImagenes: number;
}