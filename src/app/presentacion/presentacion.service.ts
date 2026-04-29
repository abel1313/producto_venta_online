import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface IImagenPresentacion {
  id:          number;
  tipo:        'LOGIN' | 'REGISTRO';
  orden:       number;
  urlImagen:   string;
  descripcion: string;
  activo:      boolean;
}

export interface IImagenUpdateRequest {
  urlImagen:   string;
  descripcion: string;
  activo:      boolean;
}

@Injectable({ providedIn: 'root' })
export class PresentacionService {
  private readonly url = `${environment.api_Url}/presentacion/imagenes`;

  constructor(private readonly http: HttpClient) {}

  getImagenesPorTipo(tipo: 'LOGIN' | 'REGISTRO'): Observable<IImagenPresentacion[]> {
    return this.http.get<IImagenPresentacion[]>(`${this.url}?tipo=${tipo}`);
  }

  getTodasImagenes(): Observable<IImagenPresentacion[]> {
    return this.http.get<IImagenPresentacion[]>(`${this.url}/todas`);
  }

  actualizarImagen(id: number, data: IImagenUpdateRequest): Observable<any> {
    return this.http.put(`${this.url}/${id}`, data);
  }
}
