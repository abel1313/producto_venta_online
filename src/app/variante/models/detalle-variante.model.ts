export interface IDetalleVariante {
  varianteId: number;
  productoId?: number | null;
  talla?: string | null;
  color?: string | null;
  marca?: string | null;
  presentacion?: string | null;
  stock: number;
  /** Lo que se cobra: `precioNormal`, o `precioOtro` si el admin lo eligió en el carrito. */
  precio: number;
  precioNormal?: number;
  /** El precio con descuento; solo le llega al admin. null = el producto no tiene. */
  precioOtro?: number | null;
  cantidad: number;
  subTotal: number;
  imagenBase64?: string | null;
  imagenUrl?: string | null;
  codigoBarras?: string | null;
}
