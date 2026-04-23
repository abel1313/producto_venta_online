import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';

export interface IVariante {
  id?: number;
  producto?: { id: number; nombre?: string; precioVenta?: number; codigoBarras?: string };
  talla?: string;
  color?: string;
  presentacion?: string;
  stock?: number;
  descripcion?: string;
  marca?: string;
  contenidoNeto?: string;
  listImagenes?: IImagenDto[];
}

export interface IVariantePaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IVariante[];
}
