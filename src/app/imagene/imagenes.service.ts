import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImagenesService {
  // Endpoint: GET /v1/imagenes/{idProducto}/imagenes  → lista de imágenes del producto
  // Endpoint: GET /v1/imagenes/file/{imagenId}        → bytes de la imagen (Content-Type correcto)
  // Endpoint: DELETE /v1/imagenes/{imagenId}          → eliminar imagen
  // Endpoint: DELETE /v1/imagenes/{productoId}/imagenes (body: string[]) → eliminar lote
  private readonly urlImg: string = `${environment.api_Url}/v1/imagenes`;

  constructor(private readonly http: HttpClient) { }

  /**
   * GET /v1/imagenes/{idProducto}/imagenes  — @Deprecated en el back.
   * El front NO migra aún; sigue funcionando. Lanza error si no hay imagen.
   */
  getDataGeneric<R>(idProducto: number): Observable<R> {
    return this.http.get<R>(`${this.urlImg}/${idProducto}/imagenes`);
  }

  /**
   * GET /v1/imagenes/{productoId}
   * Devuelve null (HTTP 204) si el producto no tiene imágenes en disco → la app NO crashea.
   * Usar cuando el toggle IMG v2 está activo en el sidebar (solo admin).
   */
  getImagenV2<R>(productoId: number): Observable<R | null> {
    return this.http.get<R>(
      `${this.urlImg}/${productoId}`,
      { observe: 'response' }
    ).pipe(
      map(response => {
        if (response.status === 204) {
          console.log(`[imagen-v2] productoId=${productoId} — sin imágenes en disco`);
          return null;
        }
        return response.body;
      }),
      catchError(err => {
        console.error(`[imagen-v2] Error al obtener imágenes productoId=${productoId}`, err);
        return of(null);
      })
    );
  }

  /**
   * Descarga la imagen como Blob y la convierte a data URL para mostrarla con <img [src]>.
   * Usa HttpClient para que el interceptor añada el token de autorización.
   * Endpoint: GET /v1/imagenes/file/{imagenId}
   */
  getImagenFile(imagenId: string): Observable<string> {
    return this.http.get(`${this.urlImg}/file/${imagenId}`, { responseType: 'blob' }).pipe(
      map(blob => URL.createObjectURL(blob))
    );
  }

  deleteById<R>(idImagen: string): Observable<R> {
    return this.http.delete<R>(`${this.urlImg}/${idImagen}`);
  }

  eliminarImagenesBatch(productoId: number, ids: string[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.urlImg}/${productoId}/imagenes`, { body: ids });
  }

  setPrincipalProducto(imagenId: string): Observable<any> {
    return this.http.put<any>(`${environment.api_imagenes}/v1/producto-imagen/${imagenId}/principal`, null);
  }
}
