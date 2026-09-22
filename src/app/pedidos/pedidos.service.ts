import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { IPedidos } from '../productos/producto/detalle-productos/models/pedidos.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPedidoGenerico } from './mis-pedidos/models/IPedidoGenerico.model';
import { IPageable } from './mis-pedidos/models/IPageable.mode';
import { PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import {
  AgregarArticuloRequest,
  CambiarArticuloRequest,
  CambiarTipoPedidoRequest
} from './models/editar-pedido.model';

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
    buscarPedidoPorCliente(buscar: string, size: number, page: number, lugarEntregaId?: number | null, tiposPedido?: string[], estadosPedido?: string[]): Observable<ResponseGeneric<IPageable<IPedidoGenerico[]>>> {
    const queryBuscar = buscar ? `&buscar=${encodeURIComponent(buscar)}` : '';
    const queryLugar  = lugarEntregaId ? `&lugarEntregaId=${lugarEntregaId}` : '';
    const queryTipo   = (tiposPedido ?? []).map(t => `&tipoPedido=${encodeURIComponent(t)}`).join('');
    // Repetible, OR entre valores (PAGADO/CANCELADO), AND contra tipo/lugar — confirmado con el back.
    const queryEstado = (estadosPedido ?? []).map(e => `&estadoPedido=${encodeURIComponent(e)}`).join('');
    return this.http.get<ResponseGeneric<IPageable<IPedidoGenerico[]>>>(`${this.url}/v1/pedidos/buscarClientePedido?size=${size}&page=${page}${queryBuscar}${queryLugar}${queryTipo}${queryEstado}`);
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
      // Ubicación exacta de la casa del cliente (2026-08-22) — distinto de LugarEntrega,
      // que es la zona/pueblo. `null` en cualquiera de los 3 = no se toca lo ya guardado;
      // el back todavía no soporta "borrar" latitud/longitud una vez capturadas.
      latitud?: number;
      longitud?: number;
      referencias?: string;
    }): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.put<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/entrega`, body);
    }

    reenviarComprobante(pedidoId: number, body: { correo: string; ticketHtml: string }): Observable<any> {
      return this.http.post<any>(`${this.url}/v1/pedidos/${pedidoId}/notificar`, body);
    }

    // ── Editar un pedido ya creado (back 2026-09-22) ────────────────────────────────
    // Los 4 van detrás de permisos configurables: sin la migración corrida dan 403 a todos,
    // admin incluido, y después de correrla hay que volver a entrar (los permisos viajan
    // dentro del JWT).

    /**
     * Cambia la forma de cobro de un pedido ya creado (Normal / Apartado / Ir pagando).
     *
     * Si el cliente paga en el momento, el back registra el abono ANTES de cambiar el tipo
     * — por eso `montoCobrado` y `descripcion` van en el mismo request y no en dos llamadas.
     */
    cambiarTipoPedido(pedidoId: number, body: CambiarTipoPedidoRequest): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.put<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/tipo`, body);
    }

    /** Agrega un artículo al pedido, a precio de catálogo. */
    agregarArticulo(pedidoId: number, body: AgregarArticuloRequest): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.post<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/articulos`, body);
    }

    /**
     * Cambia una línea por otro artículo.
     *
     * ⚠️ Puede contestar **409** cuando el artículo nuevo rompe un combo de promoción. Eso NO
     * es un error: el body trae las dos salidas y hay que preguntarle al usuario cuál quiere,
     * para después reenviar el mismo request con `modo`.
     */
    cambiarArticulo(pedidoId: number, detalleId: number, body: CambiarArticuloRequest): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.put<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/articulos/${detalleId}`, body);
    }

    /** Quita una promoción completa del pedido — todas sus líneas de una vez. */
    quitarPromocion(pedidoId: number, promocionId: number): Observable<ResponseGeneric<PedidoDetalleResponse>> {
      return this.http.delete<ResponseGeneric<PedidoDetalleResponse>>(`${this.url}/v1/pedidos/${pedidoId}/promociones/${promocionId}`);
    }
}
