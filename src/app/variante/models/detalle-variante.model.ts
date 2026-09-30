export interface IDetalleVariante {
  varianteId: number;
  productoId?: number | null;
  talla?: string | null;
  color?: string | null;
  marca?: string | null;
  presentacion?: string | null;
  stock: number;
  /** Lo que se cobra: `precioNormal`, o el descuento si `usaOtroPrecio`. */
  precio: number;
  precioNormal?: number;
  /**
   * true = la línea se cobra con el precio con descuento. El monto del descuento sin aplicar no
   * se guarda en ningún lado: se le pide al back al destaparlo o al marcar "Usar" (R9).
   */
  usaOtroPrecio?: boolean;
  cantidad: number;
  subTotal: number;
  imagenBase64?: string | null;
  imagenUrl?: string | null;
  codigoBarras?: string | null;
}
