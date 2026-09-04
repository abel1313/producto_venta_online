import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface INegocioEstado {
  abierto:       boolean;
  whatsappUrl:   string | null;
  facebookUrl:   string | null;
  instagramUrl?: string | null;
  tiktokUrl?:    string | null;
  horaApertura?: string;   // "09:00"
  horaCierre?:   string;   // "21:00"
  umbralStockBajo?: number; // aviso diario por correo a los admin cuando una variante llega a esto o menos
}

export interface IAlertaStockRequest {
  umbralStockBajo: number;
}

export interface IContactosRequest {
  whatsappUrl:   string;
  facebookUrl:   string;
  instagramUrl?: string;
  tiktokUrl?:    string;
}

export interface IContactosPublicos {
  whatsappUrl:   string | null;
  facebookUrl:   string | null;
  instagramUrl?: string | null;
  tiktokUrl?:    string | null;
  tiendaUrl?:    string | null;
}

export interface IHorarioRequest {
  horaApertura: string;
  horaCierre:   string;
}

@Injectable({ providedIn: 'root' })
export class NegocioService {
  private readonly url = `${environment.api_Url}/v1/negocio`;

  constructor(private readonly http: HttpClient) {}

  /**
   * ⚠️ Estos dos responden **envueltos** en `ResponseGeneric`: `{ mensaje, code, data, lista }`.
   * Se desenvuelven aquí para que ningún componente pueda leer el nivel equivocado — que es
   * justo el bug que dejó la pantalla de configuración con el horario en sus valores por
   * defecto y las URLs vacías (comprobado contra QA: `/estado` y `/contactos` traen todo
   * dentro de `data`).
   */
  getEstado(): Observable<INegocioEstado> {
    return this.http.get<any>(`${this.url}/estado`).pipe(map(r => (r?.data ?? r) as INegocioEstado));
  }

  getConfig(): Observable<INegocioEstado> {
    return this.http.get<any>(`${this.url}/config`).pipe(map(r => (r?.data ?? r) as INegocioEstado));
  }

  abrir(): Observable<any> {
    return this.http.post(`${this.url}/abrir`, {});
  }

  cerrar(): Observable<any> {
    return this.http.post(`${this.url}/cerrar`, {});
  }

  getContactosPublicos(): Observable<IContactosPublicos> {
    return this.http.get<any>(`${this.url}/contactos`).pipe(
      map(r => {
        // Maneja respuesta directa { whatsappUrl, facebookUrl } o envuelta { data: {...} }
        const d = r?.data ?? r;
        return {
          whatsappUrl:  d?.whatsappUrl  ?? null,
          facebookUrl:  d?.facebookUrl  ?? null,
          instagramUrl: d?.instagramUrl ?? null,
          tiktokUrl:    d?.tiktokUrl    ?? null,
          tiendaUrl:    d?.tiendaUrl    ?? null
        } as IContactosPublicos;
      })
    );
  }

  actualizarContactos(data: IContactosRequest): Observable<any> {
    return this.http.put(`${this.url}/contactos`, data);
  }

  actualizarHorario(data: IHorarioRequest): Observable<any> {
    return this.http.put(`${this.url}/horario`, data);
  }

  actualizarUmbralStockBajo(data: IAlertaStockRequest): Observable<any> {
    return this.http.put(`${this.url}/alertas-stock`, data);
  }
}
