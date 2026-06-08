import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IPalabraClave, IPalabraClaveRequest, IPalabrasClavePaginable } from '../models/palabra-clave.model';

@Injectable({ providedIn: 'root' })
export class PalabraClaveService {

  private readonly url = `${environment.api_Url}/v1/palabras-clave`;

  constructor(private readonly http: HttpClient) {}

  // GET /palabras-clave/buscar?nombre=bol — autocomplete en formularios de producto/variante
  buscar(nombre: string, pagina = 1, size = 10): Observable<IPalabraClave[]> {
    return this.http
      .get<IPalabrasClavePaginable>(`${this.url}/buscar?nombre=${encodeURIComponent(nombre)}&pagina=${pagina}&size=${size}`)
      .pipe(map(res => res.t ?? []));
  }

  // GET /palabras-clave/getAll?page=0&size=100 — carga el catálogo completo al iniciar el gestor
  getAll(page = 0, size = 100): Observable<IPalabraClave[]> {
    return this.http
      .get<{ data: IPalabraClave[] }>(`${this.url}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
  }

  // GET /palabras-clave/getOne/{id}
  getOne(id: number): Observable<IPalabraClave> {
    return this.http
      .get<{ data: IPalabraClave }>(`${this.url}/getOne/${id}`)
      .pipe(map(res => res.data));
  }

  // POST /palabras-clave/save — solo ADMIN
  save(req: IPalabraClaveRequest): Observable<IPalabraClave> {
    return this.http
      .post<{ data: IPalabraClave }>(`${this.url}/save`, req)
      .pipe(map(res => res.data));
  }

  // PUT /palabras-clave/update/{id} — solo ADMIN
  update(id: number, req: IPalabraClaveRequest): Observable<IPalabraClave> {
    return this.http
      .put<{ data: IPalabraClave }>(`${this.url}/update/${id}`, { id, ...req })
      .pipe(map(res => res.data));
  }

  // DELETE /palabras-clave/delete — body: id (number) — solo ADMIN
  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/delete`, { body: id });
  }
}
