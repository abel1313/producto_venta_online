import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  /** Lista de imágenes de un producto. Cada imagen trae urlImagen (relativa) para cargarla. */
  getDataGeneric<R>(idProducto: number): Observable<R> {
    return this.http.get<R>(`${this.urlImg}/${idProducto}/imagenes`);
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
    return this.http.delete<{ data: string }>(`${this.urlImg}/${productoId}/imagenes`, { body: ids });
  }
}
