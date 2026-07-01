import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { AbonoRequest, AbonoResponse, CancelarAbonoRequest, CancelarAbonoResponse, EstadoCuenta, PedidoPagado, ReporteCancelado, TransferirAbonoRequest, TransferirAbonoResponse } from '../models/abono.model';

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

  reporteCancelados(): Observable<ResponseGeneric<ReporteCancelado[]>> {
    return this.http.get<ResponseGeneric<ReporteCancelado[]>>(`${this.base}/reporte/cancelados`);
  }

  cancelar(pedidoId: number, body: CancelarAbonoRequest): Observable<ResponseGeneric<CancelarAbonoResponse>> {
    return this.http.put<ResponseGeneric<CancelarAbonoResponse>>(`${this.base}/${pedidoId}/cancelar`, body);
  }

  transferir(pedidoIdOrigen: number, body: TransferirAbonoRequest): Observable<ResponseGeneric<TransferirAbonoResponse>> {
    return this.http.post<ResponseGeneric<TransferirAbonoResponse>>(`${this.base}/${pedidoIdOrigen}/transferir`, body);
  }
}
