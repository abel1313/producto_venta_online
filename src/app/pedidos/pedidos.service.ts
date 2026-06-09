import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { IPedidos } from '../productos/producto/detalle-productos/models/pedidos.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPedidoGenerico } from './mis-pedidos/models/IPedidoGenerico.model';
import { IPageable } from './mis-pedidos/models/IPageable.mode';

@Injectable({
  providedIn: 'root'
})
export class PedidosService extends CrudGenericService<IPedidos> {

  constructor(http: HttpClient) {
    super(http, 'v1/pedidos')
  }

  getDataOnePedido(id: number, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/v1/pedidos/findPedido/${id}?size=${size}&page=${page}`);
  }
  getDataOnePedidoById(idPedido: number,idCliente: number, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/v1/pedidos/findPedido/${idPedido}/${idCliente}?size=${size}&page=${page}`);
  }

    buscarPedidoPorCliente(buscar: string, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    const query = buscar ? `&buscar=${encodeURIComponent(buscar)}` : '';
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/v1/pedidos/buscarClientePedido?size=${size}&page=${page}${query}`);
  }

    updateService(id:number,data: IPedidoGenerico): Observable<ResponseGeneric<IPedidoGenerico>> {
      return this.http.put<ResponseGeneric<IPedidoGenerico>>(`${this.url}/v1/pedidos/confirmar/${id}`, data);
    }

    eliminarDetalle(pedidoId: number, productoId: number, cantidad: number = 1): Observable<ResponseGeneric<string>> {
      return this.http.delete<ResponseGeneric<string>>(`${this.url}/v1/pedidos/${pedidoId}/detalle/${productoId}?cantidad=${cantidad}`);
    }

    cancelarConMotivo(id: number, motivo: string): Observable<any> {
      return this.http.delete<any>(`${this.url}/v1/pedidos/delete/${id}?motivo=${encodeURIComponent(motivo)}`);
    }
}
