import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IGasto, IGastoReporte, IPaginadoGasto, IPaginadoVenta } from '../models/IGastos.model';

@Injectable({ providedIn: 'root' })
export class GastosService {
  private readonly base = `${environment.api_Url}/v1`;

  constructor(private readonly http: HttpClient) {}

  buscarGastos(params: {
    fecha?: string; fechaInicio?: string; fechaFin?: string;
    categoria?: string; page?: number; size?: number;
  } = {}): Observable<IPaginadoGasto> {
    const p = new URLSearchParams();
    if (params.fecha)       p.set('fecha',       params.fecha);
    if (params.fechaInicio) p.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin)    p.set('fechaFin',    params.fechaFin);
    if (params.categoria)   p.set('categoria',   params.categoria);
    p.set('page', String(params.page ?? 0));
    p.set('size', String(params.size ?? 20));
    return this.http
      .get<{ response: IPaginadoGasto }>(`${this.base}/gastos/buscar?${p}`)
      .pipe(map(r => r.response));
  }

  saveGasto(gasto: Partial<IGasto>): Observable<IGasto> {
    return this.http
      .post<{ response: IGasto }>(`${this.base}/gastos/save`, gasto)
      .pipe(map(r => r.response));
  }

  updateGasto(id: number, gasto: Partial<IGasto>): Observable<IGasto> {
    return this.http
      .put<{ response: IGasto }>(`${this.base}/gastos/${id}`, gasto)
      .pipe(map(r => r.response));
  }

  deleteGasto(id: number): Observable<string> {
    return this.http
      .delete<{ response: string }>(`${this.base}/gastos/${id}`)
      .pipe(map(r => r.response));
  }

  buscarVentas(params: {
    fecha?: string; fechaInicio?: string; fechaFin?: string;
    page?: number; size?: number;
  } = {}): Observable<IPaginadoVenta> {
    const p = new URLSearchParams();
    if (params.fecha)       p.set('fecha',       params.fecha);
    if (params.fechaInicio) p.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin)    p.set('fechaFin',    params.fechaFin);
    p.set('page', String(params.page ?? 0));
    p.set('size', String(params.size ?? 20));
    return this.http
      .get<{ response: IPaginadoVenta }>(`${this.base}/ventas/buscar?${p}`)
      .pipe(map(r => r.response));
  }

  getReporte(fechaInicio?: string, fechaFin?: string): Observable<IGastoReporte> {
    const p = new URLSearchParams();
    if (fechaInicio) p.set('fechaInicio', fechaInicio);
    if (fechaFin)    p.set('fechaFin',    fechaFin);
    return this.http
      .get<{ response: IGastoReporte }>(`${this.base}/gastos/reporte?${p}`)
      .pipe(map(r => r.response));
  }
}
