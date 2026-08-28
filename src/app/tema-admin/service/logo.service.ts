import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ILogo } from '../models/logo.model';

interface ISubirLogoDto {
  // String base64 plano (sin el prefijo "data:...;base64,") -- Jackson decodifica un JSON string
  // directo a byte[] en el back (LogoUploadDto.base64), mismo criterio que ya usan
  // ImagenPresentacionUpdateDto/ImagenDTO para las imágenes de producto.
  base64: string;
  extension: string;
  nombreImagen: string;
}

@Injectable({ providedIn: 'root' })
export class LogoService {

  private readonly url = `${environment.api_Url}/logos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ILogo[]> {
    return this.http.get<{ data: ILogo[] }>(this.url).pipe(map(res => res.data ?? []));
  }

  subir(dto: ISubirLogoDto): Observable<ILogo> {
    return this.http.post<{ data: ILogo }>(this.url, dto).pipe(map(res => res.data));
  }

  activar(id: number): Observable<ILogo> {
    return this.http.put<{ data: ILogo }>(`${this.url}/${id}/activar`, {}).pipe(map(res => res.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** URL completa (dominio + ruta) para pintar el <img> del logo. */
  urlCompleta(logo: ILogo): string {
    return `${environment.api_Url}${logo.urlImagen}`;
  }
}
