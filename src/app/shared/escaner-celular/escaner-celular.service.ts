import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SesionEscaner { id: string; venceEn: string; }
export interface CodigoRecibido { secuencia: number; codigo: string; }
export interface LecturaEscaner { ultimaSecuencia: number; codigos: CodigoRecibido[]; }

interface ResponseGeneric<T> { data: T; }

/**
 * Escanear un código de barras con el CELULAR y recibirlo en la PC. La PC abre una conexión (`abrir`), muestra su id en un QR,
 * y pregunta cada ~1.5 s si llegó algo (`leer`); el celular manda lo que escanea (`enviar`). Endpoints públicos: el id aleatorio
 * del QR es lo único que protege la conexión. Las llamadas van en `skipUrls` del loading interceptor (no tapan la pantalla).
 */
@Injectable({ providedIn: 'root' })
export class EscanerCelularService {
  private readonly url = `${environment.api_Url}/v1/escaner/sesiones`;

  constructor(private readonly http: HttpClient) {}

  abrir(): Observable<SesionEscaner> {
    return this.http.post<ResponseGeneric<SesionEscaner>>(this.url, {}).pipe(map(r => r.data));
  }

  enviar(id: string, codigo: string): Observable<void> {
    return this.http.post<ResponseGeneric<boolean>>(`${this.url}/${id}/codigos`, { codigo }).pipe(map(() => undefined));
  }

  leer(id: string, desde: number): Observable<LecturaEscaner> {
    return this.http.get<ResponseGeneric<LecturaEscaner>>(`${this.url}/${id}/codigos?desde=${desde}`).pipe(map(r => r.data));
  }

  cerrar(id: string): Observable<void> {
    return this.http.delete<ResponseGeneric<boolean>>(`${this.url}/${id}`).pipe(map(() => undefined));
  }

  /** Al cerrar o recargar la pestaña (no da tiempo de esperar respuesta): `keepalive` deja que la petición termine sola. */
  cerrarAlSalir(id: string): void {
    try {
      void fetch(`${this.url}/${id}`, { method: 'DELETE', keepalive: true });
    } catch { /* si no se pudo, la conexión se libera sola a los 2 minutos sin consultas */ }
  }

  /** La dirección que lleva el QR: abre la página del celular de esa conexión. */
  direccionParaElCelular(id: string): string {
    return `${window.location.origin}/escaner/${id}`;
  }
}
