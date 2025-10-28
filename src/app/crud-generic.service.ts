import { Observable } from 'rxjs';
import { ResponseGeneric } from './../shared/index.mode';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { ServerAPI } from 'src/environments/server';
import { ICliente } from './clietes/models';
import { URL_MODULO_TOKEN } from './urls.model';

@Injectable({
  providedIn: 'root'
})
export class CrudGenericService<T> {

  protected readonly url: string = `${ServerAPI.serverApi}`;
  constructor(
    protected readonly http: HttpClient,
      @Inject(URL_MODULO_TOKEN) private readonly urlModulo: string
    
  ) { 

    this.urlModulo = urlModulo;

  }

  getData(page: number, size: number): Observable<ResponseGeneric<ICliente>> {
    return this.http.get<ResponseGeneric<ICliente>>(`${this.url}/${this.urlModulo}/getAll?page=${page}&size=${size}`);
  }
  getDataOne(tipoDato: number): Observable<ResponseGeneric<ICliente>> {
    return this.http.get<ResponseGeneric<ICliente>>(`${this.url}/${this.urlModulo}/getOne/${tipoDato}`);
  }
  
  saveData(data: T): Observable<ResponseGeneric<ICliente>> {
    return this.http.post<ResponseGeneric<ICliente>>(`${this.url}/${this.urlModulo}/save`, data);
  }
  updateData(tipoDato: number, data: T): Observable<ResponseGeneric<ICliente>> {
    return this.http.put<ResponseGeneric<ICliente>>(`${this.url}/${this.urlModulo}/update/${tipoDato}`, data);
  }

 deleteData(tipoDato: number): Observable<ResponseGeneric<ICliente>> {
    return this.http.delete<ResponseGeneric<ICliente>>(`${this.url}/${this.urlModulo}/delete/${tipoDato}`);
  }
}
