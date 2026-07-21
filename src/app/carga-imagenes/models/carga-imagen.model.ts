// Estado de la subida de la imagen al micro de imágenes.
// El producto/variante YA existen desde la primera respuesta — lo único
// que corre en segundo plano en el back es la subida del archivo.
export type EstadoImagen = 'PENDIENTE' | 'EXITOSO' | 'FALLIDO';

export interface IEstadoCargaProducto {
  productoId: number;
  varianteId: number;
  estadoImagen: EstadoImagen;
  imagenId: number | null;
  urlImagen: string | null;
  mensajeErrorImagen: string | null;
}

// Todos los campos son opcionales — se manda solo lo que el usuario ya llenó.
export interface ICompletarProducto {
  nombre?: string;
  precioCosto?: number;
  piezas?: number;
  color?: string;
  precioVenta?: number;
  precioRebaja?: number | null;
  descripcion?: string;
  marca?: string;
  contenido?: string | null;
  palabraClaveId?: number;
  codigoBarras?: string | null;
  habilitar?: boolean;
}

// Tarjeta de la grilla de captura. Vive solo en el front.
export interface ITarjetaCaptura extends IEstadoCargaProducto {
  // Preview local (ObjectURL) para no esperar a que el back devuelva urlImagen
  previewLocal: string;
  nombreArchivo: string;
  // Firma del archivo — evita subir dos veces la misma foto en la sesión
  firma: string;
  reintentando: boolean;
}
