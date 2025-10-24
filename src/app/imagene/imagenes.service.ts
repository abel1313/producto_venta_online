import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImagenesService {
  private readonly urlImg: string = `${environment.api_Url}/imagen`;
  constructor(
    private readonly http: HttpClient
  ) { }

  getDataGeneric<R>(idProducto: number): Observable<R> {
    return this.http.get<R>(`${this.urlImg}/${idProducto}/imagenes`);
  }

  deleteById<R>(idImagen: number): Observable<R> {
    return this.http.delete<R>(`${this.urlImg}/${idImagen}`);
  }
}
