import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IResena, IResenaPaginable, IResenaResumen } from '../models/resena.model';

interface ResponseGeneric<T> { data: T; code?: number; mensaje?: string; }

@Injectable({ providedIn: 'root' })
export class ResenaService {

  private readonly url = `${environment.api_Url}/v1/resenas`;

  constructor(private readonly http: HttpClient) {}

  crear(varianteId: number, calificacion: number, comentario?: string): Observable<ResponseGeneric<IResena>> {
    return this.http.post<ResponseGeneric<IResena>>(this.url, { varianteId, calificacion, comentario: comentario || null });
  }

  editar(id: number, calificacion: number, comentario?: string): Observable<ResponseGeneric<IResena>> {
    return this.http.put<ResponseGeneric<IResena>>(`${this.url}/${id}`, { calificacion, comentario: comentario || null });
  }

  eliminar(id: number): Observable<ResponseGeneric<string>> {
    return this.http.delete<ResponseGeneric<string>>(`${this.url}/${id}`);
  }

  listarPorVariante(varianteId: number, pagina: number = 1, size: number = 10): Observable<ResponseGeneric<IResenaPaginable>> {
    const params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    return this.http.get<ResponseGeneric<IResenaPaginable>>(`${this.url}/variante/${varianteId}`, { params });
  }

  resumen(varianteId: number): Observable<ResponseGeneric<IResenaResumen>> {
    return this.http.get<ResponseGeneric<IResenaResumen>>(`${this.url}/variante/${varianteId}/resumen`);
  }

  misResenas(pagina: number = 1, size: number = 10): Observable<ResponseGeneric<IResenaPaginable>> {
    const params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    return this.http.get<ResponseGeneric<IResenaPaginable>>(`${this.url}/mis-resenas`, { params });
  }
}
