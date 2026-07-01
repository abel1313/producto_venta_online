import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

export interface IImagenPresentacionV2Dto {
  id:             number;
  tipo:           'LOGIN' | 'REGISTRO';
  orden:          number;
  extension:      string;
  nombreOriginal: string;
  descripcion:    string;
  activo:         boolean;
  actualizadoEn:  string;
  urlImagen:      string;
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
  private readonly urlV2  = `${environment.api_Url}/presentacion/v1/imagenes`;

  constructor(private readonly http: HttpClient) {}

  getImagenUrl(id: number): string {
    return `${this.urlV2}/${id}/imagen`;
  }

  getImagenUrlV2(id: number): string {
    return `${this.urlV2}/${id}/imagen`;
  }

  getImagenesPorTipo(tipo: 'LOGIN' | 'REGISTRO'): Observable<IImagenPresentacion[]> {
    return this.http.get<IImagenPresentacion[]>(`${this.urlV2}?tipo=${tipo}`);
  }

    getTodasImagenesPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.url}/imagenes/${id}/imagen`);
  }

  getTodasImagenes(): Observable<any> {
    return this.http.get<any>(`${this.urlV2}/todas`);
  }

  getTodasImagenesV2(): Observable<IImagenPresentacionV2Dto[]> {
    return this.http.get<{ data: IImagenPresentacionV2Dto[] }>(`${this.urlV2}/todas`)
      .pipe(map(res => res?.data ?? []));
  }

  actualizarImagen(id: number, data: IImagenUpdateRequest): Observable<any> {
    return this.http.put<any>(`${this.urlV2}/${id}`, data);
  }

  actualizarImagenV2(id: number, data: IImagenUpdateRequest): Observable<IImagenPresentacionV2Dto> {
    return this.http.put<{ data: IImagenPresentacionV2Dto }>(`${this.urlV2}/${id}`, data)
      .pipe(map(res => res?.data ?? res as any));
  }

  getImagenesPorTipoV2(tipo: 'LOGIN' | 'REGISTRO'): Observable<IImagenPresentacionV2Dto[]> {
    return this.http.get<{ data: IImagenPresentacionV2Dto[] }>(`${this.urlV2}?tipo=${tipo}`)
      .pipe(map(res => res?.data ?? []));
  }

  getImagenV2Bytes(id: number): Observable<string> {
    return this.http.get(`${this.urlV2}/${id}/imagen`, { responseType: 'blob' })
      .pipe(map(blob => URL.createObjectURL(blob)));
  }
}
