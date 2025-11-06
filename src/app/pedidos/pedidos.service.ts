import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { IPedidos } from '../productos/producto/detalle-productos/models/pedidos.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPedidoQuery } from './mis-pedidos/models/IPedidoQuery.model';
import { IPedidoGenerico } from './mis-pedidos/models/IPedidoGenerico.model';
import { IPageable } from './mis-pedidos/models/IPageable.mode';

@Injectable({
  providedIn: 'root'
})
export class PedidosService extends CrudGenericService<IPedidos> {

  constructor(http: HttpClient) {
    super(http, 'pedidos')
  }

  getDataOnePedido(id: number, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/pedidos/findPedido/${id}?size=${size}&page=${page}`);
  }
  getDataOnePedidoById(idPedido: number,idCliente: number, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/pedidos/findPedido/${idPedido}/${idCliente}?size=${size}&page=${page}`);
  }

    buscarPedidoPorCliente(buscar: string, size: number, page: number): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/pedidos/buscarClientePedido/${buscar}?size=${size}&page=${page}`);
  }

    updateService(id:number,data: IPedidoGenerico): Observable<ResponseGeneric<IPedidoGenerico>> {
      return this.http.put<ResponseGeneric<IPedidoGenerico>>(`${this.url}/pedidos/update/${id}`, data);
    }
}
