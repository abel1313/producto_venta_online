import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IAnilloLugarEntrega,
  IAnilloLugarEntregaRequest,
  ICalcularCostoEnvioResponse,
  ILugarEntrega,
  ILugarEntregaRequest,
} from '../models/lugar-entrega.model';

@Injectable({ providedIn: 'root' })
export class LugarEntregaService {

  private readonly url = `${environment.api_Url}/v1/lugares-entrega`;

  constructor(private readonly http: HttpClient) {}

  // GET /lugares-entrega/getAll?page=0&size=N — CRUD genérico, pagina de verdad pero devuelve
  // el arreglo PLANO de esa página (sin envolver en PginaDto — el back documentó mal el shape
  // la primera vez, confirmado 2026-07-24: es { data: [...] }, no { data: { t: [...] } }).
  // Sin total de registros en la respuesta, así que "hay más" se infiere por
  // length === size (mismo criterio en gestion-lugares.component.ts).
  //
  // Dos usos distintos del mismo endpoint:
  // - Selects/autocomplete (venta-directa, editar-entrega, filtro de pedidos): piden todo de
  //   un jalón con size grande (default 200 acá) — no deben paginar.
  // - Catálogo admin (gestion-lugares.component.ts): sí pagina de verdad, pasando su propio
  //   page/size chico (10) con controles de página.
  getAll(page = 0, size = 200): Observable<ILugarEntrega[]> {
    return this.http
      .get<{ data: ILugarEntrega[] }>(`${this.url}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
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

  // ── Anillos (rangos de distancia con precio propio) — ver DISENO_ZONAS_POR_ANILLO.md ──────

  getAnillos(lugarEntregaId: number): Observable<IAnilloLugarEntrega[]> {
    return this.http
      .get<{ data: IAnilloLugarEntrega[] }>(`${this.url}/${lugarEntregaId}/anillos`)
      .pipe(map(res => res.data ?? []));
  }

  crearAnillo(lugarEntregaId: number, req: IAnilloLugarEntregaRequest): Observable<IAnilloLugarEntrega> {
    return this.http
      .post<{ data: IAnilloLugarEntrega }>(`${this.url}/${lugarEntregaId}/anillos`, req)
      .pipe(map(res => res.data));
  }

  editarAnillo(anilloId: number, req: IAnilloLugarEntregaRequest): Observable<IAnilloLugarEntrega> {
    return this.http
      .put<{ data: IAnilloLugarEntrega }>(`${this.url}/anillos/${anilloId}`, req)
      .pipe(map(res => res.data));
  }

  eliminarAnillo(anilloId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/anillos/${anilloId}`);
  }

  // Público -- lo llama el checkout (con o sin sesión) antes de dejar avanzar/confirmar, y
  // "Info de entrega" para calcular el diferencial antes de aplicar un cambio de zona/punto.
  calcularCosto(lugarEntregaId: number, latitud: number, longitud: number): Observable<ICalcularCostoEnvioResponse> {
    return this.http
      .post<{ data: ICalcularCostoEnvioResponse }>(`${this.url}/${lugarEntregaId}/calcular-costo`, { latitud, longitud })
      .pipe(map(res => res.data));
  }
}
