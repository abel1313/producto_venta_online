import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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

  /**
   * Estado abierto/cerrado compartido por toda la app. Existe porque los botones flotantes de
   * contacto (WhatsApp/Facebook/Instagram/TikTok del chatbot) solo deben verse con el negocio
   * CERRADO, pero el chatbot leía el estado una sola vez en su ngOnInit: al abrir o cerrar el
   * negocio desde el menú, los botones se quedaban como estaban hasta recargar o volver a
   * entrar. Ahora `abrir()`/`cerrar()`/`getEstado()` empujan aquí el valor nuevo y cualquier
   * pantalla suscrita reacciona en el momento. `null` = todavía no se sabe (no responde aún
   * `/estado`), que no es lo mismo que "cerrado".
   */
  private readonly abiertoSubject = new BehaviorSubject<boolean | null>(null);
  readonly abierto$ = this.abiertoSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  /**
   * ⚠️ Estos dos responden **envueltos** en `ResponseGeneric`: `{ mensaje, code, data, lista }`.
   * Se desenvuelven aquí para que ningún componente pueda leer el nivel equivocado — que es
   * justo el bug que dejó la pantalla de configuración con el horario en sus valores por
   * defecto y las URLs vacías (comprobado contra QA: `/estado` y `/contactos` traen todo
   * dentro de `data`).
   */
  getEstado(): Observable<INegocioEstado> {
    return this.http.get<any>(`${this.url}/estado`).pipe(
      map(r => (r?.data ?? r) as INegocioEstado),
      tap(estado => this.abiertoSubject.next(!!estado?.abierto))
    );
  }

  getConfig(): Observable<INegocioEstado> {
    return this.http.get<any>(`${this.url}/config`).pipe(map(r => (r?.data ?? r) as INegocioEstado));
  }

  abrir(): Observable<any> {
    return this.http.post(`${this.url}/abrir`, {}).pipe(tap(() => this.abiertoSubject.next(true)));
  }

  cerrar(): Observable<any> {
    return this.http.post(`${this.url}/cerrar`, {}).pipe(tap(() => this.abiertoSubject.next(false)));
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
