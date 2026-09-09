import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IEntregaZonaSemana, IProgramarEntregaZonaRequest } from '../models/entrega-zona.model';

@Injectable({ providedIn: 'root' })
export class EntregaZonaService {

  private readonly url = `${environment.api_Url}/v1/entregas-zona`;

  constructor(private readonly http: HttpClient) {}

  // Sin rango el back devuelve la semana en curso, igual que siempre.
  pendientes(lugarEntregaId: number, desde?: string, hasta?: string): Observable<IEntregaZonaSemana> {
    const query = new URLSearchParams();
    if (desde) query.set('desde', desde);
    if (hasta) query.set('hasta', hasta);
    const qs = query.toString();
    return this.http
      .get<{ data: IEntregaZonaSemana }>(`${this.url}/${lugarEntregaId}/pendientes${qs ? '?' + qs : ''}`)
      .pipe(map(res => res.data));
  }

  programar(lugarEntregaId: number, req: IProgramarEntregaZonaRequest): Observable<number> {
    return this.http
      .post<{ data: number }>(`${this.url}/${lugarEntregaId}/programar`, req)
      .pipe(map(res => res.data));
  }
}
