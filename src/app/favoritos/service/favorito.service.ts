import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IVarianteResumenPaginable } from '../../variante/models/variante.model';

interface ResponseGeneric<T> { data: T; code?: number; mensaje?: string; }

@Injectable({ providedIn: 'root' })
export class FavoritoService {

  private readonly url = `${environment.api_Url}/v1/favoritos`;

  constructor(private readonly http: HttpClient) {}

  agregar(varianteId: number): Observable<ResponseGeneric<string>> {
    return this.http.post<ResponseGeneric<string>>(`${this.url}/${varianteId}`, null);
  }

  quitar(varianteId: number): Observable<ResponseGeneric<string>> {
    return this.http.delete<ResponseGeneric<string>>(`${this.url}/${varianteId}`);
  }

  listar(pagina: number = 1, size: number = 10): Observable<ResponseGeneric<IVarianteResumenPaginable>> {
    const params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    return this.http.get<ResponseGeneric<IVarianteResumenPaginable>>(this.url, { params });
  }

  listarIds(): Observable<ResponseGeneric<number[]>> {
    return this.http.get<ResponseGeneric<number[]>>(`${this.url}/ids`);
  }
}
