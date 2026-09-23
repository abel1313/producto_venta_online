import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import {
  AbonoGrupoRequest,
  AbonoGrupoResponse,
  GrupoPedidos,
  UnirPedidosRequest
} from './models/grupo-pedido.model';

@Injectable({ providedIn: 'root' })
export class GrupoPedidoService {
  private readonly base = `${environment.api_Url}/v1/grupos-pedido`;

  constructor(private readonly http: HttpClient) {}

  unir(body: UnirPedidosRequest): Observable<ResponseGeneric<GrupoPedidos>> {
    return this.http.post<ResponseGeneric<GrupoPedidos>>(this.base, body);
  }

  /** El grupo activo del pedido. El back responde 204 sin body si no está unido → `null`. */
  porPedido(pedidoId: number): Observable<ResponseGeneric<GrupoPedidos> | null> {
    return this.http.get<ResponseGeneric<GrupoPedidos> | null>(`${this.base}/por-pedido/${pedidoId}`);
  }

  abonar(grupoId: number, body: AbonoGrupoRequest): Observable<ResponseGeneric<AbonoGrupoResponse>> {
    return this.http.post<ResponseGeneric<AbonoGrupoResponse>>(`${this.base}/${grupoId}/abonos`, body);
  }

  deshacer(grupoId: number, motivo?: string): Observable<ResponseGeneric<GrupoPedidos>> {
    return this.http.post<ResponseGeneric<GrupoPedidos>>(`${this.base}/${grupoId}/deshacer`, { motivo });
  }
}
