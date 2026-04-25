import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IDetallePago, IHistorialMpMpItem, IHistorialMpPage, IPagosYMeses, ITarifaTerminal, ITipoPago, IIvaTerminal, IOpcionPagoDto, ITerminalEstadoResponse, ITerminalIniciarRequest, ITerminalIniciarResponse, MpEstado } from './mis-pedidos/models/IPago.model';

@Injectable({ providedIn: 'root' })
export class PagoService {

  private readonly url = `${environment.api_Url}`;

  constructor(private readonly http: HttpClient) {}

  getTiposPago(): Observable<ResponseGeneric<ITipoPago[]>> {
    return this.http.get<ResponseGeneric<ITipoPago[]>>(`${this.url}/pagos/tipos-pago`);
  }

  getTarifas(): Observable<ResponseGeneric<ITarifaTerminal[]>> {
    return this.http.get<ResponseGeneric<ITarifaTerminal[]>>(`${this.url}/pagos/tarifas`);
  }

  getIva(): Observable<ResponseGeneric<IIvaTerminal[]>> {
    return this.http.get<ResponseGeneric<IIvaTerminal[]>>(`${this.url}/pagos/iva`);
  }

  getOpciones(): Observable<ResponseGeneric<IDetallePago[]>> {
    return this.http.get<ResponseGeneric<IDetallePago[]>>(`${this.url}/pagos/opciones`);
  }

  getOpcionesPorTipo(tipoPagoId: number): Observable<ResponseGeneric<IPagosYMeses[]>> {
    return this.http.get<ResponseGeneric<IPagosYMeses[]>>(`${this.url}/pagos/opciones-por-tipo/${tipoPagoId}`);
  }

  getOpcionesEstructuradas(): Observable<ResponseGeneric<IOpcionPagoDto[]>> {
    return this.http.get<ResponseGeneric<IOpcionPagoDto[]>>(`${this.url}/pagos/opciones-estructuradas`);
  }

  iniciarPagoTerminal(request: ITerminalIniciarRequest): Observable<ITerminalIniciarResponse> {
    return this.http.post<ITerminalIniciarResponse>(`${this.url}/mp/iniciar`, request);
  }

  getEstadoTerminal(intentId: string): Observable<ITerminalEstadoResponse> {
    return this.http.get<ITerminalEstadoResponse>(`${this.url}/mp/estado/${intentId}`);
  }

  cancelarPagoTerminal(intentId: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/mp/cancelar/${intentId}`);
  }

  getHistorial(pagina: number, size: number): Observable<IHistorialMpPage> {
    return this.http.get<IHistorialMpPage>(`${this.url}/mp/historial?pagina=${pagina}&size=${size}`);
  }

  getHistorialPorPedido(pedidoId: number, pagina: number, size: number): Observable<IHistorialMpPage> {
    return this.http.get<IHistorialMpPage>(`${this.url}/mp/historial/pedido/${pedidoId}?pagina=${pagina}&size=${size}`);
  }

  getHistorialPorEstado(estado: MpEstado, pagina: number, size: number): Observable<IHistorialMpPage> {
    return this.http.get<IHistorialMpPage>(`${this.url}/mp/historial/estado/${estado}?pagina=${pagina}&size=${size}`);
  }

  getHistorialDirectoMp(desde: string, hasta: string): Observable<IHistorialMpMpItem[]> {
    return this.http.get<IHistorialMpMpItem[]>(`${this.url}/mp/historial/mp?desde=${desde}&hasta=${hasta}`);
  }
}
