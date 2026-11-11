import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface IGastoViaje { concepto: string; monto: number; cuentaParaCubrir: boolean; }

export interface IProductoViaje {
  productoId: number; nombre: string | null; codigoBarras?: string | null;
  piezas: number; costoUnitario: number; fletePorPieza: number;
  /** Solo lectura: flete por pieza × piezas. */
  fleteDelRenglon?: number;
}

/** Un viaje de compra. Lo que no se manda (solo lectura) lo calcula el back: costo a cubrir, flete asignado, lo que falta, excedente... */
export interface IViaje {
  id?: number;
  nombre: string;
  fecha: string | null;
  fleteTotal: number;
  nota: string | null;
  gastos: IGastoViaje[];
  productos: IProductoViaje[];
  gastosTotal?: number; costoACubrir?: number; fleteAsignado?: number; faltaAsignar?: number; excedente?: number;
  compraTotal?: number; piezasTotal?: number; fleteSugeridoPorPieza?: number;
}

/** Fletes: viajes de compra (flete, gastos y productos que llegaron). Solo administrador. Contrato: `CAMBIOS_FRONT.md` del back, sección «Fletes». */
@Injectable({ providedIn: 'root' })
export class FletesService {
  private readonly url = `${environment.api_Url}/v1/fletes`;

  constructor(private readonly http: HttpClient) {}

  /** La lista viene en `lista` (convención de ResponseGeneric); vacía responde 404. */
  listar(): Observable<IViaje[]> {
    return this.http.get<{ lista: IViaje[] }>(this.url).pipe(
      map(r => r.lista ?? []),
      catchError(e => (e?.status === 404 ? of([] as IViaje[]) : (() => { throw e; })())));
  }

  crear(v: IViaje): Observable<IViaje> {
    return this.http.post<{ data: IViaje }>(this.url, this.cuerpo(v)).pipe(map(r => r.data));
  }

  actualizar(id: number, v: IViaje): Observable<IViaje> {
    return this.http.put<{ data: IViaje }>(`${this.url}/${id}`, this.cuerpo(v)).pipe(map(r => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<unknown>(`${this.url}/${id}`).pipe(map(() => undefined));
  }

  /** Los viajes en los que llegó un producto (para avisar antes de contar su flete dos veces). Vacío si no está en ninguno o si falla. */
  deProducto(productoId: number): Observable<IViaje[]> {
    return this.http.get<{ lista: IViaje[] }>(`${this.url}/por-producto/${productoId}`).pipe(
      map(r => r.lista ?? []), catchError(() => of([] as IViaje[])));
  }

  /** Solo se manda lo que el back guarda (los nombres y totales calculados no). */
  private cuerpo(v: IViaje): unknown {
    return {
      nombre: v.nombre, fecha: v.fecha, fleteTotal: +v.fleteTotal || 0, nota: v.nota || null,
      gastos: v.gastos.map(g => ({ concepto: g.concepto, monto: +g.monto, cuentaParaCubrir: g.cuentaParaCubrir })),
      productos: v.productos.map(p => ({ productoId: p.productoId, piezas: +p.piezas, costoUnitario: +p.costoUnitario || 0, fletePorPieza: +p.fletePorPieza || 0 }))
    };
  }
}
