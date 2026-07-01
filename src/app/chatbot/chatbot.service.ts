import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface IMensajeChat {
  rol: string;
  contenido: string;
}

export interface IChatbotProducto {
  varianteId: number;
  nombre:     string;
  marca:      string | null;
  talla:      string | null;
  color:      string | null;
  precio:     number;
  stock:      number;
}

export interface IChatbotBuscarResponse {
  productos:      IChatbotProducto[];
  hayMas:         boolean;
  busquedaQuery:  string;
  busquedaOffset: number;
}

export interface IChatbotResponse {
  respuesta:       string;
  bloqueado:       boolean;
  segundosEspera:  number;
  productos?:      IChatbotProducto[];
  hayMas?:         boolean;
  busquedaQuery?:  string;
  busquedaOffset?: number;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly urlMensaje  = `${environment.api_Url}/v1/chatbot/mensaje`;
  private readonly urlBuscar   = `${environment.api_Url}/v1/chatbot/buscar`;
  private readonly urlImagenes = `${environment.api_Url}/v1/variantes/imagenes`;

  constructor(private readonly http: HttpClient) {}

  enviar(mensaje: string, historial: IMensajeChat[]): Observable<IChatbotResponse> {
    return this.http.post<IChatbotResponse>(this.urlMensaje, { mensaje, historial });
  }

  buscar(q: string, offset: number): Observable<IChatbotBuscarResponse> {
    return this.http.get<IChatbotBuscarResponse>(
      `${this.urlBuscar}?q=${encodeURIComponent(q)}&offset=${offset}`
    );
  }

  getImagenVariante(varianteId: number): Observable<string | null> {
    return this.http.get<{ data: { urlImagen: string }[] }>(
      `${this.urlImagenes}/${varianteId}`
    ).pipe(
      map(res => res?.data?.[0]?.urlImagen ?? null),
      catchError(() => of(null))
    );
  }
}
