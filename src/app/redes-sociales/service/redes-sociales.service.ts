import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IHashtagsDefault,
  IPublicacionRed,
  IPublicarFotoRequest,
  IPublicarInstagramRequest,
  IPublicarReelRequest,
  IPublicarTikTokRequest,
  IPublicarVideoRequest,
  PlataformaRed
} from '../models/publicacion.model';

/** Lo que el componente necesita saber mientras sube: % de avance o el resultado final. */
export interface IProgresoPublicacion {
  /**
   * `subiendo`   → el archivo va en camino, `porcentaje` avanza.
   * `procesando` → ya llegó completo al back, que ahora lo manda a Facebook. Puede
   *                tardar minutos y NO hay forma de medirlo: aquí la barra se queda
   *                al 100% y hay que cambiar el texto para que no parezca colgado.
   * `listo`      → respuesta final del back.
   */
  tipo: 'subiendo' | 'procesando' | 'listo';
  /** 0-100. */
  porcentaje: number;
  /** Solo viene cuando `tipo === 'listo'`. */
  publicacion?: IPublicacionRed;
}

@Injectable({ providedIn: 'root' })
export class RedesSocialesService {

  private readonly url = `${environment.api_Url}/v1/redes-sociales/facebook`;
  private readonly urlInstagram = `${environment.api_Url}/v1/redes-sociales/instagram`;
  private readonly urlTikTok   = `${environment.api_Url}/v1/redes-sociales/tiktok`;
  private readonly urlHashtags = `${environment.api_Url}/v1/redes-sociales/hashtags-default`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Los hashtags fijos de las 3 redes. Siempre devuelve las 3 filas, aunque estén vacías.
   *
   * ⚠️ Responde en **`lista`**, no en `data` (el PUT sí usa `data`). Ver `IHashtagsDefault`.
   */
  hashtagsDefault(): Observable<IHashtagsDefault[]> {
    return this.http
      .get<{ lista: IHashtagsDefault[] }>(this.urlHashtags)
      .pipe(map(r => r?.lista ?? []));
  }

  /**
   * **Reemplaza** los hashtags fijos de esa red — no agrega. Para quitar uno se manda el texto ya
   * sin él; para borrarlos todos, cadena vacía.
   */
  guardarHashtagsDefault(red: PlataformaRed, hashtags: string): Observable<IHashtagsDefault> {
    return this.http
      .put<{ data: IHashtagsDefault }>(`${this.urlHashtags}/${red}`, { hashtags })
      .pipe(map(r => r?.data));
  }

  /**
   * Publica una foto en Instagram. Solo ADMIN. **JSON, no multipart** — no se manda archivo:
   * Instagram exige una URL pública y el back reusa la del microservicio de imágenes.
   *
   * Sin barra de progreso a propósito: no hay nada que subir, es un request chico. Por eso no
   * pasa por `enviar()`.
   */
  publicarInstagram(req: IPublicarInstagramRequest): Observable<IPublicacionRed> {
    const body: any = { varianteId: req.varianteId, descripcion: req.descripcion };
    // Igual que en Facebook: el opcional se OMITE, no se manda vacío — mandarlo como '' haría
    // que el back lo tome como valor y descarte la imagen principal.
    if (req.imagenId) body.imagenId = req.imagenId;
    if (req.scheduledPublishTime) body.scheduledPublishTime = req.scheduledPublishTime;

    return this.http
      .post<{ data: IPublicacionRed }>(`${this.urlInstagram}/publicar`, body)
      .pipe(map(r => r.data));
  }

  /**
   * Publica un Reel en Instagram. Solo ADMIN. **Multipart** — aquí sí va un archivo.
   *
   * Sí usa `enviar()` (a diferencia de la foto de Instagram): hay archivo, así que hay barra de
   * progreso. Ojo con la fase `procesando`: Meta procesa el video DESPUÉS de recibirlo y el back
   * espera hasta 3 minutos — la barra llega al 100% mucho antes de que termine de verdad.
   */
  publicarReelInstagram(req: IPublicarReelRequest): Observable<IProgresoPublicacion> {
    const form = new FormData();
    this.agregarVariante(form, req.varianteId);
    form.append('descripcion', req.descripcion);
    form.append('video', req.video, req.video.name);
    if (req.scheduledPublishTime) form.append('scheduledPublishTime', req.scheduledPublishTime);

    return this.enviar(`${this.urlInstagram}/publicar-reel`, form);
  }

  /**
   * Publica una foto en el feed de la página. Solo ADMIN.
   *
   * Si no se manda `imagenNueva` ni `imagenId`, el back usa la imagen principal ya
   * guardada de la variante (y responde 400 si la variante no tiene ninguna).
   */
  publicarFoto(req: IPublicarFotoRequest): Observable<IProgresoPublicacion> {
    const form = new FormData();
    form.append('varianteId', String(req.varianteId));
    form.append('descripcion', req.descripcion);
    // Los opcionales se OMITEN cuando no aplican — mandar el part vacío haría que el
    // back lo tome como valor y descarte la imagen principal.
    if (req.imagenNueva)          form.append('imagenNueva', req.imagenNueva, req.imagenNueva.name);
    else if (req.imagenId)        form.append('imagenId', req.imagenId);
    if (req.scheduledPublishTime) form.append('scheduledPublishTime', req.scheduledPublishTime);

    return this.enviar(`${this.url}/publicar`, form);
  }

  /**
   * Publica un video en el feed de la página. Solo ADMIN.
   *
   * ⚠️ El archivo es obligatorio en cada llamada — el catálogo no guarda video de
   * variantes, así que no hay a qué caer por defecto. Puede tardar varios minutos:
   * el back espera hasta 5 antes de dar timeout hacia Facebook.
   */
  publicarVideo(req: IPublicarVideoRequest): Observable<IProgresoPublicacion> {
    const form = new FormData();
    this.agregarVariante(form, req.varianteId);
    form.append('descripcion', req.descripcion);
    form.append('video', req.video, req.video.name);
    if (req.scheduledPublishTime) form.append('scheduledPublishTime', req.scheduledPublishTime);

    return this.enviar(`${this.url}/publicar-video`, form);
  }

  /**
   * Publica un Reel en Facebook. Solo ADMIN. **Multipart.**
   *
   * Mismo mecanismo reanudable que el Reel de Instagram (el back lo absorbe entero), así que
   * también **tarda** — la barra llega al 100% antes de que termine de verdad.
   *
   * `scheduledPublishTime` **sí funciona ahora**: no usa el scheduler nativo de Meta (que en
   * `/video_reels` no existe), sino el job propio del back.
   */
  publicarReelFacebook(req: IPublicarReelRequest): Observable<IProgresoPublicacion> {
    const form = new FormData();
    this.agregarVariante(form, req.varianteId);
    form.append('descripcion', req.descripcion);
    form.append('video', req.video, req.video.name);
    if (req.scheduledPublishTime) form.append('scheduledPublishTime', req.scheduledPublishTime);

    return this.enviar(`${this.url}/publicar-reel`, form);
  }

  /**
   * Publica un video en TikTok. Solo ADMIN. **Multipart. Solo video** — su API no tiene foto.
   *
   * ⚠️ Mientras la app no pase la auditoría de TikTok, el video sale **forzado a privado** y solo
   * funciona con las cuentas del Sandbox. Es de TikTok, no del back.
   */
  publicarTikTok(req: IPublicarTikTokRequest): Observable<IProgresoPublicacion> {
    const form = new FormData();
    this.agregarVariante(form, req.varianteId);
    form.append('descripcion', req.descripcion);
    form.append('video', req.video, req.video.name);
    if (req.scheduledPublishTime) form.append('scheduledPublishTime', req.scheduledPublishTime);

    return this.enviar(`${this.urlTikTok}/publicar`, form);
  }

  /**
   * El part se **omite** si no hay variante — mandarlo como `"null"` o vacío haría que el back
   * intente convertirlo a `Long` y responda un 500 feo en vez de tomarlo como ausente (mismo
   * problema que ya pasó con `imagenId`). Ver `VARIANTE_OPCIONAL` en el modelo.
   */
  private agregarVariante(form: FormData, varianteId?: number | null): void {
    if (varianteId != null) form.append('varianteId', String(varianteId));
  }

  /**
   * `reportProgress` + `observe: 'events'` para poder pintar una barra de avance real —
   * sin esto, una subida de video de 200 MB se ve como una pantalla congelada varios
   * minutos. Ver también `LoadingInterceptor.skipUrls`, que excluye estas rutas del
   * overlay global (taparía toda la app durante la subida).
   */
  private enviar(url: string, form: FormData): Observable<IProgresoPublicacion> {
    return this.http.post<{ data: IPublicacionRed }>(url, form, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      // Solo interesan estos dos tipos de evento. Los demás (`Sent`, `ResponseHeader`,
      // `DownloadProgress`) se descartan: si se mapearan, uno de ellos llegaría DESPUÉS
      // de terminar la subida y regresaría la barra a 0.
      filter((e: HttpEvent<{ data: IPublicacionRed }>) =>
        e.type === HttpEventType.UploadProgress || e instanceof HttpResponse),
      map((evento: HttpEvent<{ data: IPublicacionRed }>) => {
        if (evento.type === HttpEventType.UploadProgress) {
          // `total` puede venir undefined si el server no anuncia el tamaño.
          const porcentaje = evento.total ? Math.round((evento.loaded / evento.total) * 100) : 0;
          return {
            tipo: porcentaje >= 100 ? 'procesando' : 'subiendo',
            porcentaje
          } as IProgresoPublicacion;
        }
        return {
          tipo: 'listo',
          porcentaje: 100,
          publicacion: (evento as HttpResponse<{ data: IPublicacionRed }>).body?.data
        } as IProgresoPublicacion;
      })
    );
  }
}
