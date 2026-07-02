import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface DashboardResumen {
  ventasHoy: number;
  ventasMes: number;
  gananciaMes: number;
  gastosMes: number;
  gananciaNetaMes: number;
  pedidosPendientesEntregar: number;
  creditosActivos: number;
  montoPorCobrar: number;
  productosStockBajo: number;
}

interface ResponseGeneric<T> { data: T; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly url = `${environment.api_Url}/v1/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getResumen(): Observable<DashboardResumen> {
    return this.http
      .get<ResponseGeneric<DashboardResumen>>(`${this.url}/resumen`)
      .pipe(map(r => r.data));
  }
}
