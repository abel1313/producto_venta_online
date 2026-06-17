import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { environment } from 'src/environments/environment';
import {
  EventoAdmin,
  SesionActiva,
  MensajeHistorial,
  MensajeUI,
  ApiResponse
} from '../models/chat.models';

export interface SesionUI extends SesionActiva {
  mensajes: MensajeUI[];
  noLeidos: number;
}

@Injectable({ providedIn: 'root' })
export class ChatAdminService implements OnDestroy {

  private client!: Client;

  readonly sesiones$ = new BehaviorSubject<SesionUI[]>([]);
  readonly conectado$ = new BehaviorSubject<boolean>(false);
  readonly error$ = new Subject<string>();

  private baseUrl = `${environment.api_Url}/v1/chat/admin`;

  constructor(private http: HttpClient) {}

  conectar(token: string): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new (SockJS as any)(`${environment.api_Url}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => this.onConnect(),
      onDisconnect: () => this.conectado$.next(false),
      onStompError: () => this.error$.next('Error de conexión con el chat admin.')
    });

    this.client.activate();
  }

  private onConnect(): void {
    this.client.subscribe('/topic/chat.admin', frame => {
      const evento: EventoAdmin = JSON.parse(frame.body);
      if (evento.tipo === 'NUEVA_SESION') {
        this.agregarSesion(evento);
      } else if (evento.tipo === 'MENSAJE' && evento.contenido) {
        this.agregarMensajeEnSesion(evento.sesionId, 'USUARIO', evento.contenido, evento.timestamp);
        this.incrementarNoLeidos(evento.sesionId);
      }
    });

    this.client.publish({ destination: '/app/chat.admin.conectado', body: '{}' });
    this.cargarSesiones();
    this.conectado$.next(true);
  }

  private cargarSesiones(): void {
    this.http.get<ApiResponse<SesionActiva[]>>(`${this.baseUrl}/sesiones`).pipe(
      map(r => r.data)
    ).subscribe({
      next: sesiones => {
        const actuales = this.sesiones$.value;
        const nuevas: SesionUI[] = sesiones.map(s => {
          const existente = actuales.find(a => a.sesionId === s.sesionId);
          return existente ?? { ...s, mensajes: [], noLeidos: 0 };
        });
        this.sesiones$.next(nuevas);
      }
    });
  }

  cargarHistorial(sesionId: string): void {
    this.http.get<ApiResponse<MensajeHistorial[]>>(`${this.baseUrl}/historial/${sesionId}`).pipe(
      map(r => r.data)
    ).subscribe({
      next: historial => {
        this.actualizarSesion(sesionId, s => ({
          ...s,
          mensajes: historial.map(h => ({ remitente: h.remitente, contenido: h.contenido, timestamp: h.timestamp })),
          noLeidos: 0
        }));
      }
    });
  }

  responder(sesionId: string, contenido: string): void {
    if (!this.client?.active) return;
    this.client.publish({
      destination: '/app/chat.admin.responder',
      body: JSON.stringify({ sesionId, contenido })
    });
    this.agregarMensajeEnSesion(sesionId, 'ADMIN', contenido);
  }

  cerrarSesion(sesionId: string): void {
    this.http.post(`${this.baseUrl}/cerrar/${sesionId}`, null).subscribe({
      next: () => {
        const filtradas = this.sesiones$.value.filter(s => s.sesionId !== sesionId);
        this.sesiones$.next(filtradas);
      }
    });
  }

  marcarLeido(sesionId: string): void {
    this.actualizarSesion(sesionId, s => ({ ...s, noLeidos: 0 }));
  }

  private agregarSesion(evento: EventoAdmin): void {
    const actual = this.sesiones$.value;
    if (actual.find(s => s.sesionId === evento.sesionId)) return;
    const nueva: SesionUI = {
      sesionId: evento.sesionId,
      nombreUsuario: evento.nombreUsuario,
      fechaInicio: new Date().toISOString(),
      ultimaActividad: new Date().toISOString(),
      ultimoMensaje: null,
      mensajes: [],
      noLeidos: 0
    };
    this.sesiones$.next([...actual, nueva]);
  }

  private agregarMensajeEnSesion(
    sesionId: string,
    remitente: 'USUARIO' | 'ADMIN',
    contenido: string,
    timestamp?: string
  ): void {
    const ts = timestamp ?? new Date().toISOString().slice(0, 19);
    this.actualizarSesion(sesionId, s => ({
      ...s,
      mensajes: [...s.mensajes, { remitente, contenido, timestamp: ts }],
      ultimoMensaje: contenido,
      ultimaActividad: ts
    }));
  }

  private incrementarNoLeidos(sesionId: string): void {
    this.actualizarSesion(sesionId, s => ({ ...s, noLeidos: s.noLeidos + 1 }));
  }

  private actualizarSesion(sesionId: string, fn: (s: SesionUI) => SesionUI): void {
    const sesiones = this.sesiones$.value.map(s => s.sesionId === sesionId ? fn(s) : s);
    this.sesiones$.next(sesiones);
  }

  desconectar(): void {
    if (this.client?.active) this.client.deactivate();
    this.conectado$.next(false);
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
