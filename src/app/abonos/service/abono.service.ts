import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { AbonoRequest, AbonoResponse, EstadoCuenta, PedidoPagado } from '../models/abono.model';

@Injectable({ providedIn: 'root' })
export class AbonoService {
  private readonly base = `${environment.api_Url}/v1/abonos`;

  constructor(private readonly http: HttpClient) {}

  registrarAbono(pedidoId: number, body: AbonoRequest): Observable<ResponseGeneric<AbonoResponse>> {
    return this.http.post<ResponseGeneric<AbonoResponse>>(`${this.base}/${pedidoId}`, body);
  }

  obtenerAbonos(pedidoId: number): Observable<ResponseGeneric<AbonoResponse[]>> {
    return this.http.get<ResponseGeneric<AbonoResponse[]>>(`${this.base}/${pedidoId}`);
  }

  reporteEstadoCuenta(): Observable<ResponseGeneric<EstadoCuenta[]>> {
    return this.http.get<ResponseGeneric<EstadoCuenta[]>>(`${this.base}/reporte/estado-cuenta`);
  }

  reportePagados(): Observable<ResponseGeneric<PedidoPagado[]>> {
    return this.http.get<ResponseGeneric<PedidoPagado[]>>(`${this.base}/reporte/pagados`);
  }
}
