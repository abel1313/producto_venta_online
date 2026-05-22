import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImagenesService {
  // Endpoint: GET /mis-productos/imagen/{idProducto}/imagenes  → lista de imágenes del producto
  // Endpoint: GET /mis-productos/imagen/file/{imagenId}        → bytes de la imagen (Content-Type correcto)
  // Endpoint: DELETE /mis-productos/imagen/{imagenId}          → eliminar imagen
  // Endpoint: DELETE /mis-productos/imagen/{productoId}/imagenes (body: string[]) → eliminar lote
  private readonly urlImg: string = `${environment.api_Url}/imagen`;

  constructor(private readonly http: HttpClient) { }

  /**
   * GET /imagen/{idProducto}/imagenes  — @Deprecated en el back.
   * El front NO migra aún; sigue funcionando. Lanza error si no hay imagen.
   */
  getDataGeneric<R>(idProducto: number): Observable<R> {
    return this.http.get<R>(`${this.urlImg}/${idProducto}/imagenes`);
  }

  /**
   * GET /imagen/v2/{productoId}  — nuevo endpoint.
   * Devuelve null (HTTP 204) si el producto no tiene imágenes en disco → la app NO crashea.
   * Usar cuando el toggle IMG v2 está activo en el sidebar (solo admin).
   */
  getImagenV2<R>(productoId: number): Observable<R | null> {
    return this.http.get<R>(
      `${this.urlImg}/v2/${productoId}`,
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
   * Endpoint: GET /mis-productos/imagen/file/{imagenId}
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
    return this.http.delete<{ data: string }>(`${this.urlImg}/v2/${productoId}/imagenes`, { body: ids });
  }

  setPrincipalProducto(imagenId: string): Observable<any> {
    return this.http.put<any>(`${environment.api_imagenes}/producto-imagen/${imagenId}/principal`, null);
  }
}
