/**
 * Publicación en redes sociales — por ahora solo Facebook (feed), foto o video.
 * Contrato documentado por el back en CAMBIOS_FRONT.md (2026-08-05).
 *
 * ⚠️ Ambos endpoints son `multipart/form-data`, NO JSON — se necesitaba para poder
 * mandar el archivo en el mismo request. No hay que setear `Content-Type` a mano:
 * el browser lo pone solo con su boundary cuando el body es un `FormData`.
 */

/** `tiktok` ya está en el tipo aunque el back todavía no tenga endpoint — la pantalla lo muestra
 *  deshabilitado para que se vea contemplado, no olvidado. */
export type PlataformaRed = 'facebook' | 'instagram' | 'tiktok';
/** `reel` solo existe en Instagram por ahora — el Reel de Facebook queda para otra ronda. */
export type TipoPublicacion = 'foto' | 'video' | 'reel';
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
  /**
   * ⚠️ El id de Instagram viaja en **este mismo campo** — el back no agregó uno nuevo para no
   * tocar el contrato. Hay que mirar `plataforma` para saber de cuál red es antes de armar el
   * link, porque el dominio cambia.
   */
  postIdFacebook: string;
  scheduledPublishTime: string | null;
  fechaPublicacion: string;
  estado: EstadoPublicacion;
}

/**
 * `POST /v1/redes-sociales/instagram/publicar` — solo ADMIN. **JSON, no multipart.**
 *
 * Alcance más chico que Facebook, y no por decisión nuestra:
 * - **Solo imagen ya guardada.** Instagram no acepta un archivo subido directo: su API exige una
 *   URL pública, así que el back reusa la del microservicio de imágenes. No hay equivalente de
 *   `imagenNueva`.
 * - **No se puede programar.** La Content Publishing API de Instagram siempre publica de
 *   inmediato — es limitación de Meta, no del back.
 */
export interface IPublicarInstagramRequest {
  varianteId: number;
  descripcion: string;
  /** Opcional — omitido, usa la imagen principal de la variante (igual que Facebook). */
  imagenId?: string | null;
}

/**
 * `POST /v1/redes-sociales/instagram/publicar-reel` — solo ADMIN. **Multipart**, no JSON (aquí sí
 * viaja un archivo, a diferencia de la foto de Instagram).
 *
 * ⚠️ **Tarda.** Meta procesa el video después de subirlo y antes de poder publicarlo; el back
 * espera hasta **3 minutos** antes de rendirse. La barra de progreso llega al 100% mucho antes de
 * que termine de verdad — por eso la fase `procesando` existe y el texto tiene que decirlo, si no
 * parece colgado.
 *
 * Si Meta se pasa de esos 3 minutos, el back responde 400 pidiendo reintentar: no se perdió nada,
 * pero tampoco se creó el post.
 */
export interface IPublicarReelRequest {
  varianteId: number;
  descripcion: string;
  /** Obligatorio en cada llamada — el catálogo no guarda video, no hay "reel principal". */
  video: File;
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
