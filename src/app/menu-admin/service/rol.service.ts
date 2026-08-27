import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IRol, IRolRequest } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class RolAdminService {

  private readonly urlRoles = `${environment.api_Url}/v1/roles`;

  constructor(private readonly http: HttpClient) {}

  getRoles(page = 0, size = 100): Observable<IRol[]> {
    return this.http
      .get<{ data: IRol[] }>(`${this.urlRoles}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
  }

  saveRol(req: IRolRequest): Observable<IRol> {
    return this.http.post<{ data: IRol }>(`${this.urlRoles}/save`, req).pipe(map(res => res.data));
  }

  updateRol(id: number, req: IRolRequest): Observable<IRol> {
    return this.http.put<{ data: IRol }>(`${this.urlRoles}/update/${id}`, { id, ...req }).pipe(map(res => res.data));
  }

  deleteRol(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlRoles}/delete`, { body: id });
  }

  // Devuelven el Rol completo ya actualizado (con su set de submenus), asi que el componente
  // puede refrescar el checklist sin volver a pedir todo el listado.
  agregarSubmenu(rolId: number, submenuId: number): Observable<IRol> {
    return this.http.post<{ data: IRol }>(`${this.urlRoles}/${rolId}/submenus/${submenuId}`, {})
      .pipe(map(res => res.data));
  }

  quitarSubmenu(rolId: number, submenuId: number): Observable<IRol> {
    return this.http.delete<{ data: IRol }>(`${this.urlRoles}/${rolId}/submenus/${submenuId}`)
      .pipe(map(res => res.data));
  }

  // Fase 2 de permisos de accion -- ademas de VER la pantalla (arriba), puede ESCRIBIR en ella.
  // El back rechaza agregarSubmenuEscritura si el rol todavia no tiene el "ver" de esa pantalla.
  agregarSubmenuEscritura(rolId: number, submenuId: number): Observable<IRol> {
    return this.http.post<{ data: IRol }>(`${this.urlRoles}/${rolId}/submenus/${submenuId}/escritura`, {})
      .pipe(map(res => res.data));
  }

  quitarSubmenuEscritura(rolId: number, submenuId: number): Observable<IRol> {
    return this.http.delete<{ data: IRol }>(`${this.urlRoles}/${rolId}/submenus/${submenuId}/escritura`)
      .pipe(map(res => res.data));
  }
}
