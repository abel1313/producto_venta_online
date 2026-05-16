import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';

export interface IVarianteDto {
  id: number;
  talla?: string;
  descripcion?: string;
  color?: string;
  presentacion?: string;
  stock: number;
  marca?: string;
  contenidoNeto?: string;
  precio: number;
  codigoBarras?: string;
}

export interface IVarianteRequest {
  id?: number;
  productoId: number;
  talla?: string;
  descripcion?: string;
  color?: string;
  presentacion?: string;
  stock?: number;
  marca?: string;
  contenidoNeto?: string;
  listImagenes?: IImagenDto[];
  palabraClaveId?: number | null;
  imagenPrincipalId?: string | null;
}

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
  // Palabra clave asignada — para precargar el autocomplete al editar
  palabraClave?: { id: number; nombre: string } | null;
}

export interface IVariantePaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IVariante[];
}

export interface IVarianteResumen {
  id: number;
  productoId?: number | null;
  talla?: string | null;
  descripcion?: string | null;
  color?: string | null;
  presentacion?: string | null;
  stock?: number | null;
  marca?: string | null;
  contenidoNeto?: string | null;
  imagenBase64?: string | null;
  imagenUrl?: string | null;
  precio?: number | null;
  codigoBarras?: string | null;
  nombreProducto?: string | null;
}

export interface IVarianteResumenPaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IVarianteResumen[];
}

export interface IVarianteImagenDto {
  id?: string;
  base64: string | null;
  extension: string;
  nombreImagen: string;
  urlImagen?: string | null;
  principal?: boolean;
}

export interface IVarianteImagenPaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IVarianteImagenDto[];
}
