import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ICompletarProducto, IEstadoCargaProducto } from '../models/carga-imagen.model';

// Envoltorio estándar del back (proyecto-key)
interface ResponseGeneric<T> { code?: number; mensaje?: string; data: T; }

@Injectable({ providedIn: 'root' })
export class CargaImagenesService {

  private readonly url = `${environment.api_Url}/v1/carga-imagenes`;

  constructor(private readonly http: HttpClient) {}

  // Una imagen por request — si el usuario elige 10 fotos, son 10 llamadas.
  // El producto y la variante borrador YA existen cuando esto responde.
  subirImagen(imagen: File): Observable<IEstadoCargaProducto> {
    const form = new FormData();
    form.append('imagen', imagen);
    return this.http.post<ResponseGeneric<IEstadoCargaProducto>>(`${this.url}/subir-imagen`, form)
      .pipe(map(r => r.data));
  }

  // Polling — solo con los productoId que sigan en PENDIENTE
  estado(productoIds: number[]): Observable<IEstadoCargaProducto[]> {
    let params = new HttpParams();
    productoIds.forEach(id => { params = params.append('productoIds', String(id)); });
    return this.http.get<ResponseGeneric<IEstadoCargaProducto[]>>(`${this.url}/estado`, { params })
      .pipe(map(r => r.data ?? []));
  }

  // Reutiliza el mismo producto/variante — no crea un borrador duplicado
  reintentarImagen(productoId: number, imagen: File): Observable<IEstadoCargaProducto> {
    const form = new FormData();
    form.append('imagen', imagen);
    return this.http.post<ResponseGeneric<IEstadoCargaProducto>>(`${this.url}/${productoId}/reintentar-imagen`, form)
      .pipe(map(r => r.data));
  }

  // Red de seguridad si el front perdió la lista de productoId (recarga de página)
  fallidas(): Observable<IEstadoCargaProducto[]> {
    return this.http.get<ResponseGeneric<IEstadoCargaProducto[]>>(`${this.url}/fallidas`)
      .pipe(map(r => r.data ?? []));
  }

  // Cada campo no nulo pisa el valor actual — no hace falta reenviar todo el objeto
  completar(productoId: number, body: ICompletarProducto): Observable<any> {
    return this.http.put<ResponseGeneric<any>>(`${this.url}/${productoId}/completar`, body)
      .pipe(map(r => r.data));
  }
}
