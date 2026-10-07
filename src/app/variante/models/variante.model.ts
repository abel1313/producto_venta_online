import { IImagenDto } from 'src/app/productos/producto/models/imagen.dto.mode';

export interface IVarianteDto {
  id: number;
  nombreProducto?: string | null;
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
  /** Agregar (+) o quitar (-) stock al modelo en el mismo guardado (back 2026-10-06). */
  ajusteStockModelo?: number;
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
  /** Solo admin: true si el artículo tiene precio propio, no el de su producto (2026-09-29). */
  precioPropio?: boolean | null;
  /**
   * Solo admin: el precio normal. `precio` es al que se vende, que con `usarDescuento` es el
   * descuento; aquí queda el normal para poder cobrarlo en una venta puntual.
   */
  precioNormal?: number | null;
  /** Solo admin: el artículo se vende al descuento (check "Precio descuento" del 💲). */
  usarDescuento?: boolean | null;
  codigoBarras?: string | null;
  nombreProducto?: string | null;
  habilitado?: string | null;
  // Puede venir null en variantes creadas antes de la migracion del back (2026-08-22).
  fechaCreacion?: string | null;
}

export interface IVarianteResumenPaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IVarianteResumen[];
}

export interface IFiltrosDisponibles {
  tallas: string[];
  colores: string[];
  marcas: string[];
  precioMin: number | null;
  precioMax: number | null;
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
