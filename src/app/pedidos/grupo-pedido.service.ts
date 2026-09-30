import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import {
  AbonoGrupoRequest,
  AbonoGrupoResponse,
  AgregarPedidosRequest,
  CandidatosPagina,
  CobroContadoResponse,
  GrupoPedidos,
  SeparacionResponse,
  SepararRequest,
  UnirPedidosRequest
} from './models/grupo-pedido.model';

@Injectable({ providedIn: 'root' })
export class GrupoPedidoService {
  private readonly base = `${environment.api_Url}/v1/grupos-pedido`;

  constructor(private readonly http: HttpClient) {}

  unir(body: UnirPedidosRequest): Observable<ResponseGeneric<GrupoPedidos>> {
    return this.http.post<ResponseGeneric<GrupoPedidos>>(this.base, body);
  }

  /** Suma pedidos a un grupo que ya existe; misma forma de cobro que el grupo. */
  agregar(grupoId: number, body: AgregarPedidosRequest): Observable<ResponseGeneric<GrupoPedidos>> {
    return this.http.post<ResponseGeneric<GrupoPedidos>>(`${this.base}/${grupoId}/pedidos`, body);
  }

  /**
   * Los pedidos que se pueden unir con `pedidoId` (o con su grupo), de 10 en 10.
   * `buscar`: número de pedido (desde 1 dígito) o nombre del cliente (desde 3 letras); vacío = todos.
   */
  candidatos(pedidoId: number, buscar: string, pagina: number): Observable<ResponseGeneric<CandidatosPagina>> {
    const params = new HttpParams().set('pedidoId', pedidoId).set('buscar', buscar).set('pagina', pagina);
    return this.http.get<ResponseGeneric<CandidatosPagina>>(`${this.base}/candidatos`, { params });
  }

  /** El grupo activo del pedido. El back responde 204 sin body si no está unido → `null`. */
  porPedido(pedidoId: number): Observable<ResponseGeneric<GrupoPedidos> | null> {
    return this.http.get<ResponseGeneric<GrupoPedidos> | null>(`${this.base}/por-pedido/${pedidoId}`);
  }

  abonar(grupoId: number, body: AbonoGrupoRequest): Observable<ResponseGeneric<AbonoGrupoResponse>> {
    return this.http.post<ResponseGeneric<AbonoGrupoResponse>>(`${this.base}/${grupoId}/abonos`, body);
  }

  /** Confirma de una vez los pedidos de contado del grupo que falten, con la misma forma de pago. */
  cobrarDeContado(grupoId: number, pagosYMesesId: number): Observable<ResponseGeneric<CobroContadoResponse>> {
    return this.http.post<ResponseGeneric<CobroContadoResponse>>(`${this.base}/${grupoId}/cobrar-contado`, { pagosYMesesId });
  }

  separar(grupoId: number, body: SepararRequest): Observable<ResponseGeneric<SeparacionResponse>> {
    return this.http.post<ResponseGeneric<SeparacionResponse>>(`${this.base}/${grupoId}/separar`, body);
  }

  cambiarTitular(grupoId: number, pedidoTitularId: number): Observable<ResponseGeneric<GrupoPedidos>> {
    return this.http.put<ResponseGeneric<GrupoPedidos>>(`${this.base}/${grupoId}/titular`, { pedidoTitularId });
  }
}
