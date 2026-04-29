import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface IMensajeChat {
  rol: string;
  contenido: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly url = `${environment.api_Url}/chatbot/mensaje`;

  constructor(private readonly http: HttpClient) {}

  enviar(mensaje: string, historial: IMensajeChat[]): Observable<{ respuesta: string }> {
    return this.http.post<{ respuesta: string }>(this.url, { mensaje, historial });
  }
}
