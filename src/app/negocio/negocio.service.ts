import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface INegocioEstado {
  abierto:      boolean;
  whatsappUrl:  string | null;
  facebookUrl:  string | null;
}

export interface IContactosRequest {
  whatsappUrl: string;
  facebookUrl: string;
}

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private readonly url = `${environment.api_Url}/negocio`;

  constructor(private readonly http: HttpClient) {}

  getEstado(): Observable<INegocioEstado> {
    return this.http.get<INegocioEstado>(`${this.url}/estado`);
  }

  getConfig(): Observable<any> {
    return this.http.get(`${this.url}/config`);
  }

  abrir(): Observable<any> {
    return this.http.post(`${this.url}/abrir`, {});
  }

  cerrar(): Observable<any> {
    return this.http.post(`${this.url}/cerrar`, {});
  }

  actualizarContactos(data: IContactosRequest): Observable<any> {
    return this.http.put(`${this.url}/contactos`, data);
  }
}
