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

/** Una forma de pago y qué parte de lo vendido representa (`porcentaje` de 0 a 100). `comision` = lo que se queda la terminal. */
export interface FormaDePagoVentas {
  forma:      string;
  ventas:     number;
  total:      number;
  porcentaje: number;
  comision:   number;
}

export interface VentasPorFormaDePago {
  desde:         string;
  hasta:         string;
  total:         number;
  comisionTotal: number;
  /** De la que más vendió a la que menos. Vacío si no hubo ventas en el periodo. */
  formas:        FormaDePagoVentas[];
}

/** Un mes de la gráfica de ventas, gastos y ganancia (`mes` = yyyy-MM). `gananciaNeta` = ganancia − gastos. */
export interface MesDeVentas {
  mes:          string;
  numeroVentas: number;
  ventas:       number;
  ganancia:     number;
  gastos:       number;
  gananciaNeta: number;
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

  /** Cómo te pagaron entre dos fechas (sin fechas: del día 1 del mes a hoy). Las ventas devueltas no cuentan. */
  getVentasPorFormaPago(desde?: string, hasta?: string): Observable<VentasPorFormaDePago> {
    const params: string[] = [];
    if (desde) params.push(`desde=${desde}`);
    if (hasta) params.push(`hasta=${hasta}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http
      .get<ResponseGeneric<VentasPorFormaDePago>>(`${this.url}/graficas/ventas-por-forma-pago${qs}`)
      .pipe(map(r => r.data));
  }

  /** Ventas, ganancia, gastos y ganancia neta de los últimos `meses` meses (todos seguidos; sin movimiento = cero). */
  getVentasGastosMensual(meses = 12): Observable<MesDeVentas[]> {
    return this.http
      .get<ResponseGeneric<MesDeVentas[]>>(`${this.url}/graficas/ventas-gastos-mensual?meses=${meses}`)
      .pipe(map(r => r.data ?? []));
  }
}
