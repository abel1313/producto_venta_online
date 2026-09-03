import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IPromocion, IPromocionPaginable, IPromocionRequest } from '../models/promocion.model';

interface ResponseGeneric<T> { data: T; code?: number; mensaje?: string; }

@Injectable({ providedIn: 'root' })
export class PromocionService {

  private readonly url = `${environment.api_Url}/v1/promociones`;

  constructor(private readonly http: HttpClient) {}

  crear(req: IPromocionRequest): Observable<ResponseGeneric<IPromocion>> {
    return this.http.post<ResponseGeneric<IPromocion>>(this.url, req);
  }

  editar(id: number, req: IPromocionRequest): Observable<ResponseGeneric<IPromocion>> {
    return this.http.put<ResponseGeneric<IPromocion>>(`${this.url}/${id}`, req);
  }

  toggleActivo(id: number, activo: boolean): Observable<ResponseGeneric<any>> {
    return this.http.put<ResponseGeneric<any>>(`${this.url}/${id}/activo`, { activo });
  }

  getAdmin(pagina: number = 1, size: number = 10): Observable<ResponseGeneric<IPromocionPaginable>> {
    const params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    return this.http.get<ResponseGeneric<IPromocionPaginable>>(`${this.url}/admin`, { params });
  }

  getActivas(pagina: number = 1, size: number = 10): Observable<ResponseGeneric<IPromocionPaginable>> {
    const params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    return this.http.get<ResponseGeneric<IPromocionPaginable>>(`${this.url}/activas`, { params });
  }

  // Cuantos clientes tienen el checkbox de promociones activado ahora mismo -- para mostrarle al
  // admin antes de disparar el envio (confirmacion "se va a mandar a N clientes").
  contarElegiblesParaCorreo(): Observable<ResponseGeneric<number>> {
    return this.http.get<ResponseGeneric<number>>(`${this.url}/correo/elegibles`);
  }

  // Envio en tandas de 10, corre en el back en su propio hilo -- este endpoint responde de
  // inmediato, no espera a que termine de mandarle el correo a todos.
  enviarCorreo(id: number): Observable<ResponseGeneric<string>> {
    return this.http.post<ResponseGeneric<string>>(`${this.url}/${id}/enviar-correo`, {});
  }
}
