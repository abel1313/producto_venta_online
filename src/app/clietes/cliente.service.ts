import { Injectable, InjectionToken } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { HttpClient } from '@angular/common/http';
import { ICliente } from './mis-datos/models/index.model';
import { ServerAPI } from 'src/environments/server';

@Injectable({
  providedIn: 'root'
})
export class ClienteService extends CrudGenericService<ICliente> {

  private urlDepo: string = ServerAPI.serverApi;
  constructor(
    http: HttpClient
  ) {
    super(http, 'clientes');
   }


   getCodigoPostal(codigoPostal: string){
      return this.http.get<any>(`${this.url}/dipomex/getCodigoPostal/${codigoPostal}`);
   }


}
