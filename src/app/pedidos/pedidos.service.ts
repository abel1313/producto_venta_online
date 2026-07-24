import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { IPedidos } from '../productos/producto/detalle-productos/models/pedidos.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPedidoGenerico } from './mis-pedidos/models/IPedidoGenerico.model';
import { IPageable } from './mis-pedidos/models/IPageable.mode';
import { PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';

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

    // tiposPedido: filtro por tipo (APARTADO/FIADO) — param repetido `&tipoPedido=X&tipoPedido=Y`,
    // convención Spring @RequestParam List<String>. ⚠️ Pendiente de confirmar con el back si
    // este endpoint ya lo soporta (consulta anotada en el repo compartido, 2026-07-24).
    buscarPedidoPorCliente(buscar: string, size: number, page: number, lugarEntregaId?: number | null, tiposPedido?: string[]): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    const queryBuscar = buscar ? `&buscar=${encodeURIComponent(buscar)}` : '';
    const queryLugar  = lugarEntregaId ? `&lugarEntregaId=${lugarEntregaId}` : '';
    const queryTipo   = (tiposPedido ?? []).map(t => `&tipoPedido=${encodeURIComponent(t)}`).join('');
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/v1/pedidos/buscarClientePedido?size=${size}&page=${page}${queryBuscar}${queryLugar}${queryTipo}`);
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

    getDetallePedido(pedidoId: number): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.get<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/detalle`);
    }

    // Editar nombreReceptor/direccionEntrega/fechaEntrega/observaciones después de creado el
    // pedido — todos los campos opcionales, solo se actualiza lo que se mande (null = no
    // tocar). No requiere ser admin. El back rechaza si el pedido está "cancelado".
    actualizarEntrega(pedidoId: number, body: {
      nombreReceptor?: string;
      direccionEntrega?: string;
      fechaEntrega?: string;
      observaciones?: string;
      lugarEntregaId?: number;
      urlFacebook?: string;
    }): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.put<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/entrega`, body);
    }

    reenviarComprobante(pedidoId: number, body: { correo: string; ticketHtml: string }): Observable<any> {
      return this.http.post<any>(`${this.url}/v1/pedidos/${pedidoId}/notificar`, body);
    }
}
