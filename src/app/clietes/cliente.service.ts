import { Injectable, InjectionToken } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { HttpClient } from '@angular/common/http';
import { ICliente } from './mis-datos/models/index.model';
import { Observable } from 'rxjs';
import { ResponseGeneric } from 'src/shared/generic-response.mode';

@Injectable({
  providedIn: 'root'
})
export class ClienteService extends CrudGenericService<ICliente> {

  constructor(
    http: HttpClient
  ) {
    super(http, 'clientes');
   }


   getCodigoPostal(codigoPostal: string){
      return this.http.get<any>(`${this.url}/dipomex/getCodigoPostal/${codigoPostal}`);
   }
  getDataOneCliente(idCliente: number): Observable<ResponseGeneric<ICliente>> {
    return this.http.get<ResponseGeneric<ICliente>>(`${this.url}/clientes/buscarPorIdCliente/${idCliente}`);
  }

}
