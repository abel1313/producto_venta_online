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
  varianteId:   number;
  nombre:       string;
  marca:        string | null;
  talla:        string | null;
  color:        string | null;
  precio:       number;
  stock:        number;
  descripcion?: string | null;
  codigoBarras?: string | null;
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
  // ⚠️ Ver nota de renombrado /variantes → /tienda en variante.service.ts — mismo criterio.
  private readonly urlImagenes = `${environment.api_Url}/tienda/v1/imagenes`;

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
    return this.http.get<{ data: { urlImagen: string; principal: boolean }[] }>(
      `${this.urlImagenes}/${varianteId}`
    ).pipe(
      map(res => {
        const imgs = res?.data ?? [];
        const img  = imgs.find(i => i.principal) ?? imgs[0];
        return img?.urlImagen ?? null;
      }),
      catchError(() => of(null))
    );
  }
}
