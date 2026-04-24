export interface IDetalleVariante {
  varianteId: number;
  productoId?: number | null;
  talla?: string | null;
  color?: string | null;
  marca?: string | null;
  presentacion?: string | null;
  stock: number;
  precio: number;
  cantidad: number;
  subTotal: number;
  imagenBase64?: string | null;
}
