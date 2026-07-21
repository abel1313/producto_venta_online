import { SafeUrl } from '@angular/platform-browser';

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

// Archivo elegido pero TODAVÍA NO subido. Vive en la bandeja de selección
// hasta que el usuario pulsa "Subir". Si su subida falla, se queda aquí
// (con `error`) para poder reintentarla sin volver a buscarla en el disco.
export interface IArchivoSeleccionado {
  file: File;
  // Angular 14 NO permite `blob:` en su lista blanca de sanitización de URLs
  // (solo https?|mailto|data|ftp|tel|file|sms) — un blob crudo se reescribe a
  // `unsafe:blob:` y la miniatura se ve rota. Por eso se guarda ya saneado.
  preview: SafeUrl;
  previewUrl: string;   // el ObjectURL crudo, necesario para revocarlo después
  nombre: string;
  tamano: number;       // bytes
  firma: string;
  subiendo: boolean;
  error: string;
}

// Tarjeta de la grilla de captura. Vive solo en el front.
export interface ITarjetaCaptura extends IEstadoCargaProducto {
  // Preview local (ObjectURL) para no esperar a que el back devuelva urlImagen
  // Miniatura local ya saneada (ver nota de `blob:` arriba). Si es null se
  // cae a `urlImagen`, que debe pasar por el pipe `imagenSrc` porque el
  // endpoint del back exige el JWT y un <img src> nativo no lo manda.
  previewLocal: SafeUrl | null;
  previewUrl: string;
  nombreArchivo: string;
  // Firma del archivo — evita subir dos veces la misma foto en la sesión
  firma: string;
  reintentando: boolean;
}
