import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IGasto, IGastoReporte, IPaginadoGasto, IPaginadoVenta } from '../models/IGastos.model';

@Injectable({ providedIn: 'root' })
export class GastosService {
  private readonly base = `${environment.api_Url}/v1`;

  private readonly _gastoEditar = new BehaviorSubject<IGasto | null>(null);
  readonly gastoEditar$ = this._gastoEditar.asObservable();

  setGastoEditar(g: IGasto | null): void { this._gastoEditar.next(g); }

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
      .get<{ data: IPaginadoGasto }>(`${this.base}/gastos/buscar?${p}`)
      .pipe(map(r => r.data));
  }

  saveGasto(gasto: Partial<IGasto>): Observable<IGasto> {
    return this.http
      .post<{ data: IGasto }>(`${this.base}/gastos/save`, gasto)
      .pipe(map(r => r.data));
  }

  updateGasto(id: number, gasto: Partial<IGasto>): Observable<IGasto> {
    return this.http
      .put<{ data: IGasto }>(`${this.base}/gastos/${id}`, gasto)
      .pipe(map(r => r.data));
  }

  deleteGasto(id: number): Observable<string> {
    return this.http
      .delete<{ data: string }>(`${this.base}/gastos/${id}`)
      .pipe(map(r => r.data));
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
      .get<{ data: IPaginadoVenta }>(`${this.base}/ventas/buscar?${p}`)
      .pipe(map(r => r.data));
  }

  getReporte(fechaInicio?: string, fechaFin?: string): Observable<IGastoReporte> {
    const p = new URLSearchParams();
    if (fechaInicio) p.set('fechaInicio', fechaInicio);
    if (fechaFin)    p.set('fechaFin',    fechaFin);
    return this.http
      .get<{ data: IGastoReporte }>(`${this.base}/gastos/reporte?${p}`)
      .pipe(map(r => r.data));
  }
}
