import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SesionEscaner { id: string; venceEn: string; }
export interface EstadoEscaner { vigente: boolean; celularConectado: boolean; ultimaSecuencia: number; venceEn: string; }
export interface CodigoRecibido { secuencia: number; codigo: string; }
export interface LecturaEscaner { ultimaSecuencia: number; celularConectado: boolean; codigos: CodigoRecibido[]; }

interface ResponseGeneric<T> { data: T; }

const CLAVE_SESION = 'escaner.sesion';

/**
 * Escanear un código de barras con el CELULAR y recibirlo en la PC.
 *
 * La conexión es de TRABAJO: la PC se enlaza UNA vez con el celular (QR) y la recuerda (`localStorage`); el celular se queda abierto
 * escaneando y cada vez que la PC pide un código llega en milisegundos (`esperar` deja la pregunta abierta en el servidor hasta que
 * el celular manda algo). Endpoints públicos: el id aleatorio del QR es lo único que protege la conexión. Las llamadas van en
 * `skipUrls` del loading interceptor (no tapan la pantalla).
 */
@Injectable({ providedIn: 'root' })
export class EscanerCelularService {
  private readonly url = `${environment.api_Url}/v1/escaner/sesiones`;

  constructor(private readonly http: HttpClient) {}

  abrir(): Observable<SesionEscaner> {
    return this.http.post<ResponseGeneric<SesionEscaner>>(this.url, {}).pipe(map(r => r.data));
  }

  estado(id: string): Observable<EstadoEscaner> {
    return this.http.get<ResponseGeneric<EstadoEscaner>>(`${this.url}/${id}`).pipe(map(r => r.data));
  }

  /**
   * Se queda abierta hasta que llegue un código nuevo (o ~25 s: entonces contesta vacío y hay que volver a preguntar). Si pasan 35 s sin
   * respuesta (la laptop despertó de suspensión, cambió el Wi-Fi: la conexión quedó medio abierta) se corta sola con `TimeoutError`.
   */
  esperar(id: string, desde: number): Observable<LecturaEscaner> {
    return this.http.get<ResponseGeneric<LecturaEscaner>>(`${this.url}/${id}/codigos?desde=${desde}&esperar=true`)
      .pipe(timeout(35000), map(r => r.data));
  }

  cerrar(id: string): Observable<void> {
    return this.http.delete<ResponseGeneric<boolean>>(`${this.url}/${id}`).pipe(map(() => undefined));
  }

  /** La conexión que esta PC ya tenía enlazada con un celular, si la hay. */
  sesionGuardada(): string | null {
    try { return localStorage.getItem(CLAVE_SESION); } catch { return null; }
  }

  guardarSesion(id: string): void {
    try { localStorage.setItem(CLAVE_SESION, id); } catch { /* sin almacenamiento: habrá que enlazar de nuevo cada vez */ }
  }

  olvidarSesion(): void {
    try { localStorage.removeItem(CLAVE_SESION); } catch { /* nada */ }
  }

  /**
   * Lo que lleva el QR: la página ligera del celular (`/escaner.html`, sin Angular, abre en un instante) con el id de la conexión y
   * la dirección del servidor, en el «#» para que no viajen en el registro de ningún servidor.
   */
  direccionParaElCelular(id: string): string {
    return `${window.location.origin}/escaner.html#id=${id}&api=${encodeURIComponent(environment.api_Url)}`;
  }
}
