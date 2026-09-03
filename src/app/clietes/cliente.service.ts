import { Injectable, InjectionToken } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { HttpClient } from '@angular/common/http';
import { ICliente } from './mis-datos/models/index.model';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPageableClientes } from '../productos/producto/detalle-productos/models/pedidos.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService extends CrudGenericService<ICliente> {

  constructor(
    http: HttpClient
  ) {
    super(http, 'v1/clientes');
   }


   getCodigoPostal(codigoPostal: string){
      return this.http.get<any>(`${this.url}/v1/dipomex/getCodigoPostal/${codigoPostal}`);
   }
  getDataOneCliente(idCliente: number): Observable<ResponseGeneric<ICliente>> {
    return this.http.get<ResponseGeneric<ICliente>>(`${this.url}/v1/clientes/buscarPorIdCliente/${idCliente}`);
  }

  // Detalle completo para la pantalla admin de ver/editar cliente -- a diferencia de
  // getDataOneCliente, SÍ trae usuarioId/username (Cliente.usuario no viaja en el JSON normal,
  // ver ClienteAdminDetalleDto en el back). Sin el usuarioId no se puede guardar después:
  // ClienteControllerImpl.save() lo necesita para saber a qué usuario pertenece el cliente.
  obtenerDetalleAdmin(idCliente: number): Observable<ResponseGeneric<{ cliente: ICliente; usuarioId: number; username: string }>> {
    return this.http.get<ResponseGeneric<{ cliente: ICliente; usuarioId: number; username: string }>>(
      `${this.url}/v1/clientes/admin/detalle/${idCliente}`
    );
  }

  buscarClientes(nombre: string, page: number, size: number): Observable<ResponseGeneric<IPageableClientes>> {
    return this.http.get<ResponseGeneric<IPageableClientes>>(
      `${this.url}/v1/clientes/buscar?nombre=${encodeURIComponent(nombre)}&page=${page}&size=${size}`
    );
  }

  enviarCodigoVerificacion(clienteId: number): Observable<ResponseGeneric<string>> {
    return this.http.post<ResponseGeneric<string>>(
      `${this.url}/v1/clientes/${clienteId}/enviar-codigo-verificacion`, {}
    );
  }

  verificarCorreo(clienteId: number, codigo: string): Observable<ResponseGeneric<string>> {
    return this.http.post<ResponseGeneric<string>>(
      `${this.url}/v1/clientes/${clienteId}/verificar-correo`, { codigo }
    );
  }

  resetVerificacion(clienteId: number): Observable<ResponseGeneric<string>> {
    return this.http.delete<ResponseGeneric<string>>(
      `${this.url}/v1/clientes/${clienteId}/verificacion-correo`
    );
  }

  // Toggle de correos no transaccionales (seguimiento de pedido, alerta de stock de favoritos).
  // No afecta el ticket de compra ni los códigos de verificación/reset, que siguen enviándose
  // siempre. Lo puede llamar el propio cliente o un ADMIN sobre cualquier cliente.
  actualizarPreferenciaCorreo(clienteId: number, recibirCorreos: boolean): Observable<ResponseGeneric<string>> {
    return this.http.put<ResponseGeneric<string>>(
      `${this.url}/v1/clientes/${clienteId}/preferencias-correo`, { recibirCorreos }
    );
  }

  // Checkbox independiente del de arriba -- solo controla si le llega el correo cuando el admin
  // envía una promoción nueva.
  actualizarPreferenciaPromociones(clienteId: number, recibirPromociones: boolean): Observable<ResponseGeneric<string>> {
    return this.http.put<ResponseGeneric<string>>(
      `${this.url}/v1/clientes/${clienteId}/preferencias-promociones`, { recibirPromociones }
    );
  }

}
