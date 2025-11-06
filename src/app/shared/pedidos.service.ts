import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { IPedidos, IPedidosDTOPedido } from '../productos/producto/detalle-productos/models/pedidos.model';
import { HttpClient } from '@angular/common/http';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PedidosService extends CrudGenericService<IPedidos>{

  constructor(httpClient: HttpClient) {
    super(httpClient, 'pedidos');
   }

  saveDataPedido(data: IPedidosDTOPedido): Observable<ResponseGeneric<any>> {
     console.log(  data, ' c;---------------------------------------')
    return this.http.post<ResponseGeneric<any>>(`${this.url}/pedidos/savePedido`, data);
  }

}
