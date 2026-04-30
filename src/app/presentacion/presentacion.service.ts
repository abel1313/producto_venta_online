import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface IImagenPresentacion {
  id:             number;
  tipo:           'LOGIN' | 'REGISTRO';
  orden:          number;
  descripcion:    string;
  activo:         boolean;
  nombreArchivo?: string;   // nombre guardado en disco
  urlImagen?:     string;   // URL pública para mostrar la imagen
}

export interface IImagenUpdateRequest {
  // Si se manda base64 → reemplaza el archivo
  base64?:       string;
  extension?:    string;
  nombreImagen?: string;
  // Siempre requeridos
  descripcion:   string;
  activo:        boolean;
}

@Injectable({ providedIn: 'root' })
export class PresentacionService {
  private readonly url    = `${environment.api_Url}/presentacion/imagenes`;

  constructor(private readonly http: HttpClient) {}

  // URL pública para mostrar la imagen directamente en <img src>
  getImagenUrl(id: number): string {
    return `${this.url}/${id}/imagen`;
  }

  getImagenesPorTipo(tipo: 'LOGIN' | 'REGISTRO'): Observable<IImagenPresentacion[]> {
    return this.http.get<IImagenPresentacion[]>(`${this.url}?tipo=${tipo}`);
  }

    getTodasImagenesPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.url}/imagenes/${id}/imagen`);
  }

  getTodasImagenes(): Observable<any> {
    return this.http.get<any>(`${this.url}/todas`);
  }

  actualizarImagen(id: number, data: IImagenUpdateRequest): Observable<any> {
    return this.http.put<any>(`${this.url}/${id}`, data);
  }
}
