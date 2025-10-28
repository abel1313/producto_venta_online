import { Observable } from 'rxjs';
import { ResponseGeneric } from './../shared/index.mode';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { ICliente } from './clietes/models';
import { URL_MODULO_TOKEN } from './urls.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CrudGenericService<T> {

  protected readonly url: string = `${environment.api_Url}`;
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
