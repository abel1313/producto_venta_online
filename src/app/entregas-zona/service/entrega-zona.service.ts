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

  pendientes(lugarEntregaId: number): Observable<IEntregaZonaSemana> {
    return this.http
      .get<{ data: IEntregaZonaSemana }>(`${this.url}/${lugarEntregaId}/pendientes`)
      .pipe(map(res => res.data));
  }

  programar(lugarEntregaId: number, req: IProgramarEntregaZonaRequest): Observable<number> {
    return this.http
      .post<{ data: number }>(`${this.url}/${lugarEntregaId}/programar`, req)
      .pipe(map(res => res.data));
  }
}
