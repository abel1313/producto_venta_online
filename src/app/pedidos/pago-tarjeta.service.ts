import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ICobroTarjeta, IIniciarCobroTarjeta, IOfertaMeses } from './models/pago-tarjeta.model';

/**
 * Cobro con tarjeta del módulo nuevo (`/v1/pagos-tarjeta`): terminal del local y pago en línea.
 *
 * Es el camino NUEVO y seguro (no cobra dos veces, tiene reconciliación y devoluciones). El camino viejo
 * (`PagoService` → `/v1/mp/*`) sigue existiendo para los cobros de grupo y para los ambientes donde el módulo
 * está apagado: cuando el back no tiene el módulo, `GET .../meses` responde 404 y la pantalla usa el viejo.
 *
 * Nunca se manda el monto ni quién cobra: el back usa el total del pedido y el usuario del token.
 */
@Injectable({ providedIn: 'root' })
export class PagoTarjetaService {

  private readonly url = `${environment.api_Url}/v1/pagos-tarjeta`;

  constructor(private readonly http: HttpClient) {}

  /** Meses sin intereses del pedido y, si no hay, por qué. Un 404 aquí también significa "módulo apagado en este ambiente". */
  meses(pedidoId: number): Observable<IOfertaMeses> {
    return this.http.get<{ data: IOfertaMeses }>(`${this.url}/pedido/${pedidoId}/meses`).pipe(map(r => r.data));
  }

  iniciar(request: IIniciarCobroTarjeta): Observable<ICobroTarjeta> {
    return this.http.post<{ data: ICobroTarjeta }>(this.url, request).pipe(map(r => r.data));
  }

  /** Le pregunta a la pasarela y aplica el resultado; es seguro llamarlo muchas veces. */
  estado(intentoId: number): Observable<ICobroTarjeta> {
    return this.http.get<{ data: ICobroTarjeta }>(`${this.url}/${intentoId}`).pipe(map(r => r.data));
  }

  cancelar(intentoId: number): Observable<ICobroTarjeta> {
    return this.http.post<{ data: ICobroTarjeta }>(`${this.url}/${intentoId}/cancelar`, {}).pipe(map(r => r.data));
  }

  /** Solo administrador. Sin monto = todo lo que falte por devolver. */
  devolver(intentoId: number, monto?: number): Observable<ICobroTarjeta> {
    return this.http.post<{ data: ICobroTarjeta }>(`${this.url}/${intentoId}/devolver`, monto != null ? { monto } : {})
      .pipe(map(r => r.data));
  }

  /** Texto de error del back (mensaje) o uno general. */
  static mensajeDeError(err: any): string {
    return err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo completar la operación con la tarjeta.';
  }
}
