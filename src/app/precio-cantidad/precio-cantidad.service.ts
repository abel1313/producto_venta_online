import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** El precio de grupo que le toca a un producto de la venta (lo que no aparece se cobra a su precio normal). */
export interface IPrecioGrupo {
  productoId: number;
  precioPromocion: number;
  grupoId: number;
  grupo: string;
  minimoPiezas: number;
  piezasDelGrupo: number;
}

export interface IGrupoProducto { productoId: number; nombre: string | null; precioPromocion: number; }

export interface IGrupoPrecioCantidad {
  id?: number;
  nombre: string;
  minimoPiezas: number;
  fechaInicio: string | null;
  fechaFin: string | null;
  activo: boolean;
  /** Solo lectura: activo y dentro de sus fechas hoy. */
  vigente?: boolean;
  productos: IGrupoProducto[];
}

/**
 * Precio por cantidad (grupos). Contrato: `CAMBIOS_FRONT.md` del back, sección "Grupos de precio por cantidad" (2026-11-07).
 * El back vuelve a decidir el precio al guardar la venta o el pedido; esto solo sirve para mostrarlo y mandarlo igual.
 */
@Injectable({ providedIn: 'root' })
export class PrecioCantidadService {

  private readonly urlGrupos = `${environment.api_Url}/v1/grupos-precio-cantidad`;
  private readonly urlCalculo = `${environment.api_Url}/v1/precio-cantidad/calcular`;

  constructor(private readonly http: HttpClient) {}

  /** A qué productos de la venta les toca su precio de grupo. Si falla, devuelve vacío: se cobra normal y el back confirma. */
  calcular(lineas: { productoId: number; cantidad: number }[]): Observable<IPrecioGrupo[]> {
    const utiles = lineas.filter(l => l.productoId > 0 && l.cantidad > 0);
    if (!utiles.length) return of([]);
    return this.http.post<{ data: { precios: IPrecioGrupo[] } }>(this.urlCalculo, { lineas: utiles }).pipe(
      map(r => r?.data?.precios ?? []),
      catchError(() => of([]))
    );
  }

  // ── Administración (solo ROLE_ADMIN) ──────────────────────────────────────

  listar(): Observable<IGrupoPrecioCantidad[]> {
    return this.http.get<{ lista: IGrupoPrecioCantidad[] }>(this.urlGrupos).pipe(map(r => r?.lista ?? []));
  }

  crear(g: IGrupoPrecioCantidad): Observable<IGrupoPrecioCantidad> {
    return this.http.post<{ data: IGrupoPrecioCantidad }>(this.urlGrupos, g).pipe(map(r => r.data));
  }

  actualizar(id: number, g: IGrupoPrecioCantidad): Observable<IGrupoPrecioCantidad> {
    return this.http.put<{ data: IGrupoPrecioCantidad }>(`${this.urlGrupos}/${id}`, g).pipe(map(r => r.data));
  }

  cambiarActivo(id: number, activo: boolean): Observable<IGrupoPrecioCantidad> {
    return this.http.put<{ data: IGrupoPrecioCantidad }>(`${this.urlGrupos}/${id}/activo`, { activo }).pipe(map(r => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete(`${this.urlGrupos}/${id}`).pipe(map(() => void 0));
  }

  /** El grupo del producto, o null si no está en ninguno (o no hay permiso). */
  deProducto(productoId: number): Observable<IGrupoPrecioCantidad | null> {
    return this.http.get<{ data: IGrupoPrecioCantidad | null }>(`${this.urlGrupos}/producto/${productoId}`).pipe(
      map(r => r?.data ?? null),
      catchError(() => of(null))
    );
  }
}
