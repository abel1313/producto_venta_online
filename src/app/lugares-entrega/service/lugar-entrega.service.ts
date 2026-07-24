import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ILugarEntrega, ILugarEntregaRequest, ILugaresEntregaPaginable } from '../models/lugar-entrega.model';

@Injectable({ providedIn: 'root' })
export class LugarEntregaService {

  private readonly url = `${environment.api_Url}/v1/lugares-entrega`;

  constructor(private readonly http: HttpClient) {}

  // GET /lugares-entrega/getAll?page=0&size=50 — catálogo completo (para selects/autocomplete)
  getAll(page = 0, size = 50): Observable<ILugarEntrega[]> {
    return this.http
      .get<{ data: ILugaresEntregaPaginable }>(`${this.url}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data?.t ?? []));
  }

  getOne(id: number): Observable<ILugarEntrega> {
    return this.http
      .get<{ data: ILugarEntrega }>(`${this.url}/getOne/${id}`)
      .pipe(map(res => res.data));
  }

  // POST /lugares-entrega/save — solo ADMIN
  save(req: ILugarEntregaRequest): Observable<ILugarEntrega> {
    return this.http
      .post<{ data: ILugarEntrega }>(`${this.url}/save`, req)
      .pipe(map(res => res.data));
  }

  // PUT /lugares-entrega/update/{id} — solo ADMIN
  update(id: number, req: ILugarEntregaRequest): Observable<ILugarEntrega> {
    return this.http
      .put<{ data: ILugarEntrega }>(`${this.url}/update/${id}`, { id, ...req })
      .pipe(map(res => res.data));
  }

  // DELETE /lugares-entrega/delete — body: el id crudo (número JSON, NO { id }) — solo ADMIN
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/delete`, { body: id });
  }
}
