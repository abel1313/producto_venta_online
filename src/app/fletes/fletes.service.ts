import { HttpClient, HttpParams } from '@angular/common/http';
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

/** Cómo va un viaje (de `GET /v1/fletes/reportes`): lo ya calculado por el back con las ventas ligadas. */
export interface IReporteViaje {
  viajeId: number; nombre: string; fecha: string;
  /** ABIERTO, FLETE_CUBIERTO (lo recuperado ya llegó al costo a cubrir) o VENDIDO_POR_COMPLETO. */
  estado: 'ABIERTO' | 'FLETE_CUBIERTO' | 'VENDIDO_POR_COMPLETO';
  fleteTotal: number; costoACubrir: number; fleteRecuperado: number; faltaPorCubrir: number; fleteComoGanancia: number;
  pagadoConVentaId: number | null; pagadoEn: string | null;
  piezasCompradas: number; piezasVendidas: number; piezasRestantes: number;
  totalVendido: number; costoVendido: number; gananciaVendida: number;
  renglones: { productoId: number; nombre: string | null; codigoBarras: string | null; piezasCompradas: number; piezasVendidas: number; piezasRestantes: number; totalVendido: number }[];
}

/** Una línea de venta con piezas que todavía no se ligan a ningún viaje (`pendientes` de `cantidad`). */
export interface ILineaSinViaje { detalleVentaId: number; ventaId: number; fecha: string | null; cantidad: number; pendientes: number; precioUnitario: number; }

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

  /** Cómo va cada viaje (recuperado, falta, estado, piezas vendidas). Si falla, la lista se ve sin barras (nunca se cae). */
  reportes(): Observable<IReporteViaje[]> {
    return this.http.get<{ lista: IReporteViaje[] }>(`${this.url}/reportes`).pipe(
      map(r => r.lista ?? []), catchError(() => of([] as IReporteViaje[])));
  }

  /** Ventas anteriores (no devueltas) del producto con piezas aún sin ligar a un viaje. La lista va en `lista`; vacía responde 404. */
  lineasSinViaje(productoId: number, desde?: string, hasta?: string): Observable<ILineaSinViaje[]> {
    let params = new HttpParams().set('productoId', String(productoId));
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<{ lista: ILineaSinViaje[] }>(`${this.url}/ligas/sin-viaje`, { params }).pipe(
      map(r => r.lista ?? []),
      catchError(e => (e?.status === 404 ? of([] as ILineaSinViaje[]) : (() => { throw e; })())));
  }

  /** Liga a mano piezas de ventas anteriores al viaje (guarda el flete por pieza de ese viaje). Devuelve cuántas piezas se ligaron. */
  ligarVentas(viajeId: number, productoId: number, ligas: { detalleVentaId: number; cantidad: number }[]): Observable<number> {
    return this.http.post<{ data: number }>(`${this.url}/${viajeId}/ligar`, { productoId, ligas }).pipe(map(r => r.data));
  }

  /** El reporte del viaje como archivo (Excel o PDF): bytes. El back lo arma al momento. */
  descargarReporte(viajeId: number, formato: 'XLSX' | 'PDF'): Observable<Blob> {
    return this.http.get(`${this.url}/${viajeId}/reporte/archivo`, { params: new HttpParams().set('formato', formato), responseType: 'blob' });
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
