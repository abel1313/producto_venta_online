import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IDetallePago, IPagosYMeses, ITarifaTerminal, ITipoPago, IIvaTerminal, IOpcionPagoDto } from './mis-pedidos/models/IPago.model';

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
}
