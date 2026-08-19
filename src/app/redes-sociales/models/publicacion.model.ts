/**
 * Publicación en redes sociales: Facebook, Instagram y TikTok. Foto, video de feed o Reel.
 * Contrato documentado por el back en CAMBIOS_FRONT.md.
 *
 * ⚠️ Ambos endpoints son `multipart/form-data`, NO JSON — se necesitaba para poder
 * mandar el archivo en el mismo request. No hay que setear `Content-Type` a mano:
 * el browser lo pone solo con su boundary cuando el body es un `FormData`.
 */

/** Las 3 ya tienen endpoint. TikTok solo acepta video. */
export type PlataformaRed = 'facebook' | 'instagram' | 'tiktok';
/**
 * `reel` existe en Facebook e Instagram. En TikTok todo video es "video".
 *
 * ⚠️ `foto` sigue en el tipo porque el back lo devuelve en publicaciones viejas, pero **la
 * pantalla ya no publica fotos** — decisión del dueño (2026-08-19): a redes solo se suben videos.
 */
export type TipoPublicacion = 'foto' | 'video' | 'reel';
/** `FALLIDA` es nueva: el job propio reintenta 3 veces y, si no lo logra, la marca así. */
export type EstadoPublicacion = 'PUBLICADA' | 'PROGRAMADA' | 'FALLIDA';

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
  /** `null` mientras `estado` sea `PROGRAMADA` — el post todavía no existe. */
  postIdFacebook: string | null;
  scheduledPublishTime: string | null;
  fechaPublicacion: string;
  estado: EstadoPublicacion;
  /** Cuántas veces lo intentó el job. `0` si nunca falló. */
  intentos?: number;
  /** Mensaje del último fallo — para poder decirle al admin por qué no salió. */
  ultimoError?: string | null;
}

/**
 * `POST /v1/redes-sociales/tiktok/publicar` — solo ADMIN, multipart.
 *
 * **Solo video.** La API de TikTok no tiene concepto de "publicar foto".
 *
 * ⚠️ Mientras la app no pase la auditoría de TikTok, el video sale **forzado a privado**
 * (`SELF_ONLY`) y solo funciona con las cuentas dadas de alta como Target User en su Sandbox.
 * Eso es de TikTok, no del back ni nuestro.
 */
export interface IPublicarTikTokRequest {
  /** ⚠️ Ver `VARIANTE_OPCIONAL` al final del archivo. */
  varianteId?: number | null;
  descripcion: string;
  video: File;
  /** Programado con el job propio del back, igual que las demás. */
  scheduledPublishTime?: string | null;
}

/**
 * `POST /v1/redes-sociales/instagram/publicar` — solo ADMIN. **JSON, no multipart.**
 *
 * Alcance más chico que Facebook, y no por decisión nuestra:
 * - **Solo imagen ya guardada.** Instagram no acepta un archivo subido directo: su API exige una
 *   URL pública, así que el back reusa la del microservicio de imágenes. No hay equivalente de
 *   `imagenNueva`.
 * - Programar **sí se puede ahora**, pero con el job propio del back — la API de Instagram sigue
 *   sin permitirlo por su cuenta.
 */
export interface IPublicarInstagramRequest {
  varianteId: number;
  descripcion: string;
  /** Opcional — omitido, usa la imagen principal de la variante (igual que Facebook). */
  imagenId?: string | null;
  /** Nuevo: lo programa el job propio del back, no la API de Instagram (que no lo permite). */
  scheduledPublishTime?: string | null;
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
  /** ⚠️ Ver `VARIANTE_OPCIONAL` al final del archivo. */
  varianteId?: number | null;
  descripcion: string;
  /** Obligatorio en cada llamada — el catálogo no guarda video, no hay "reel principal". */
  video: File;
  /** Nuevo: lo programa el job propio del back. */
  scheduledPublishTime?: string | null;
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
  /** ⚠️ Ver `VARIANTE_OPCIONAL` al final del archivo. */
  varianteId?: number | null;
  descripcion: string;
  /** Obligatorio — el catálogo no guarda video de variantes, no hay "video principal". */
  video: File;
  scheduledPublishTime?: string | null;
}

/**
 * Los hashtags fijos de una red — los que el dueño quiere que se precarguen solos cada vez, para
 * no reescribir siempre lo mismo.
 *
 * `GET /v1/redes-sociales/hashtags-default` devuelve **siempre las 3 filas** (sembradas vacías en
 * la migración), así que no hay caso "todavía no existe" que manejar.
 *
 * ⚠️ El GET responde en **`lista`** y el PUT en **`data`** — son shapes distintos del mismo
 * recurso. Leer el campo equivocado devuelve `undefined` sin ningún error (mismo tropiezo que ya
 * costó una sesión con `colores-flor/por-tipo-flor`).
 */
export interface IHashtagsDefault {
  id: number;
  /** `facebook` | `instagram` | `tiktok` — coincide con `PlataformaRed`. */
  redSocial: string;
  /** El texto completo. El PUT lo **reemplaza**, no agrega: para borrar uno se manda el resto. */
  hashtags: string;
  actualizadoEn: string;
}

/** Tope del micro para cualquier archivo/request (foto o video). */
export const LIMITE_ARCHIVO_MB = 200;

/**
 * Anticipación mínima para programar. **Ya no hay máximo**: la programación la hace un job del
 * propio back, no la API de cada red, así que no aplican sus topes (los 29 días del Reel de
 * Facebook, los 6 meses del video de feed). Se puede programar a la fecha que sea.
 */
export const PROGRAMAR_MIN_MINUTOS = 10;

/**
 * ⚠️ `VARIANTE_OPCIONAL` — ✅ **cerrado**, el back lo desplegó en dev y qa (2026-08-19).
 *
 * Decisión del dueño: a redes **solo se suben videos**, y un video no es de un producto del
 * catálogo (puede ser del local, un saludo, una promo general). Por eso se quitó el paso de
 * "elegir producto" de la pantalla y **el front ya no manda `varianteId`** en video ni Reel.
 *
 * Del lado del back, `publicacion_social.variante_id` ya es `NULL`-able; la FK a `variantes`
 * quedó intacta (un FK no valida la fila cuando el valor es nulo) y el job de programadas no
 * dependía de la variante.
 *
 * ⚠️ **El único efecto**: una publicación sin variante no sale en el historial *por variante*
 * (`GET .../historial?varianteId=…`) — sí en cualquier listado general, con `varianteId: null`.
 * Hoy no consumimos ese historial desde ningún lado; si algún día se hace, hay que contar con
 * que los videos no van a estar ahí.
 *
 * La **foto** sí necesita variante (es de donde sale la imagen) y sus endpoints se quedaron
 * obligatorios, pero esa opción ya no existe en la pantalla.
 */
