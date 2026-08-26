import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IMenu, IMenuRequest, ISubmenu, ISubmenuRequest } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuAdminService {

  private readonly urlMenu = `${environment.api_Url}/v1/menu`;
  private readonly urlSubmenu = `${environment.api_Url}/v1/submenu`;

  constructor(private readonly http: HttpClient) {}

  // ── Menu ──────────────────────────────────────────────────────────

  // CRUD generico, igual que LugarEntregaService.getAll(): pagina de verdad pero devuelve el
  // arreglo PLANO de esa pagina (sin envolver en PginaDto).
  getMenus(page = 0, size = 100): Observable<IMenu[]> {
    return this.http
      .get<{ data: IMenu[] }>(`${this.urlMenu}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
  }

  saveMenu(req: IMenuRequest): Observable<IMenu> {
    return this.http.post<{ data: IMenu }>(`${this.urlMenu}/save`, req).pipe(map(res => res.data));
  }

  updateMenu(id: number, req: IMenuRequest): Observable<IMenu> {
    return this.http.put<{ data: IMenu }>(`${this.urlMenu}/update/${id}`, { id, ...req }).pipe(map(res => res.data));
  }

  deleteMenu(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlMenu}/delete`, { body: id });
  }

  // ── Submenu ───────────────────────────────────────────────────────

  getSubmenus(page = 0, size = 200): Observable<ISubmenu[]> {
    return this.http
      .get<{ data: ISubmenu[] }>(`${this.urlSubmenu}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
  }

  getSubmenusPorMenu(menuId: number): Observable<ISubmenu[]> {
    return this.http
      .get<{ data: ISubmenu[] }>(`${this.urlSubmenu}/porMenu/${menuId}`)
      .pipe(map(res => res.data ?? []));
  }

  saveSubmenu(req: ISubmenuRequest): Observable<ISubmenu> {
    return this.http.post<{ data: ISubmenu }>(`${this.urlSubmenu}/save`, req).pipe(map(res => res.data));
  }

  updateSubmenu(id: number, req: ISubmenuRequest): Observable<ISubmenu> {
    return this.http.put<{ data: ISubmenu }>(`${this.urlSubmenu}/update/${id}`, { id, ...req }).pipe(map(res => res.data));
  }

  deleteSubmenu(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlSubmenu}/delete`, { body: id });
  }
}
