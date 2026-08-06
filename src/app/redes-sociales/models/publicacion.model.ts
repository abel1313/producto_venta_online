/**
 * Publicación en redes sociales — por ahora solo Facebook (feed), foto o video.
 * Contrato documentado por el back en CAMBIOS_FRONT.md (2026-08-05).
 *
 * ⚠️ Ambos endpoints son `multipart/form-data`, NO JSON — se necesitaba para poder
 * mandar el archivo en el mismo request. No hay que setear `Content-Type` a mano:
 * el browser lo pone solo con su boundary cuando el body es un `FormData`.
 */

export type PlataformaRed = 'facebook';
export type TipoPublicacion = 'foto' | 'video';
export type EstadoPublicacion = 'PUBLICADA' | 'PROGRAMADA';

export interface IPublicacionRed {
  id: number;
  varianteId: number;
  plataforma: PlataformaRed;
  tipoPublicacion: TipoPublicacion;
  descripcionPublicada: string;
  /** Para foto es el `post_id`; para video es el **id del video** (Facebook no siempre
   *  devuelve un post_id aparte en publicaciones de video). En ambos casos sirve para
   *  armar el link: `https://www.facebook.com/{postIdFacebook}`. */
  postIdFacebook: string;
  scheduledPublishTime: string | null;
  fechaPublicacion: string;
  estado: EstadoPublicacion;
}

export interface IPublicarFotoRequest {
  varianteId: number;
  descripcion: string;
  /** Imagen ya guardada de la variante (distinta a la principal). Se ignora si va `imagenNueva`. */
  imagenId?: string | null;
  /** Archivo suelto solo para esta publicación — no se guarda en la galería de la variante.
   *  Gana sobre `imagenId` y sobre la imagen principal. */
  imagenNueva?: File | null;
  /** ISO LocalDateTime. Omitido = publicar de inmediato. */
  scheduledPublishTime?: string | null;
}

export interface IPublicarVideoRequest {
  varianteId: number;
  descripcion: string;
  /** Obligatorio — el catálogo no guarda video de variantes, no hay "video principal". */
  video: File;
  scheduledPublishTime?: string | null;
}

/** Tope del micro para cualquier archivo/request (foto o video). */
export const LIMITE_ARCHIVO_MB = 200;

/** Ventana que acepta el back para programar una publicación. */
export const PROGRAMAR_MIN_MINUTOS = 10;
export const PROGRAMAR_MAX_MESES = 6;
