import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ApiResponse, EstadoConexion, EventoUsuario, MensajeHistorial, MensajeUI } from '../models/chat.models';

const SESION_KEY = 'chatSesionId';

@Injectable({ providedIn: 'root' })
export class ChatLiveService implements OnDestroy {

  private client!: Client;

  sesionId: string | null = null;

  private readonly historialUrl = `${environment.api_Url}/v1/chat/historial`;

  readonly mensajes$ = new BehaviorSubject<MensajeUI[]>([]);
  readonly conectado$ = new BehaviorSubject<boolean>(false);
  readonly sesionCerrada$ = new Subject<void>();
  readonly error$ = new Subject<string>();
  readonly estadoConexion$ = new BehaviorSubject<EstadoConexion>('reconectando');

  private nombreUsuario = 'Visitante';
  private timeoutRestaurado: any;
  private onOffline = () => this.estadoConexion$.next('sin-internet');
  private onOnline  = () => this.estadoConexion$.next('reconectando');

  constructor(private http: HttpClient) {}

  conectar(nombre: string): void {
    if (this.client?.active) return;

    // Recuperar sesión anterior si existe
    const sesionGuardada = sessionStorage.getItem(SESION_KEY);
    if (sesionGuardada && !this.sesionId) {
      this.sesionId = sesionGuardada;
    }

    this.nombreUsuario = nombre || 'Visitante';

    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online',  this.onOnline);

    this.client = new Client({
      webSocketFactory: () => new (SockJS as any)(
        `${environment.api_Url}/ws`,
        null,
        { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }
      ),
      reconnectDelay: 15000,
      onConnect: () => this.onConnect(),
      onDisconnect: () => {
        this.conectado$.next(false);
      },
      onWebSocketClose: () => {
        if (this.estadoConexion$.value !== 'sin-internet') {
          this.estadoConexion$.next('reconectando');
        }
        this.conectado$.next(false);
      },
      onWebSocketError: () => {
        if (this.estadoConexion$.value !== 'sin-internet') {
          this.estadoConexion$.next('reconectando');
        }
      },
      onStompError: () => this.error$.next('Error de conexión con el chat.')
    });

    this.client.activate();
  }

  private onConnect(): void {
    // Reconexión: sesión ya existe → re-suscribir y cargar historial
    if (this.sesionId) {
      this.suscribirseAlCanal(this.sesionId);
      this.cargarHistorial(this.sesionId);
      this.marcarRestaurado();
      return;
    }

    // Primera conexión: pedir sesión nueva
    const tempId = crypto.randomUUID();

    const subInicio = this.client.subscribe(
      `/topic/chat.inicio.${tempId}`,
      frame => {
        const response = JSON.parse(frame.body);
        this.sesionId = response.sesionId;
        sessionStorage.setItem(SESION_KEY, this.sesionId!);
        this.suscribirseAlCanal(this.sesionId!);
        this.conectado$.next(true);
        this.marcarRestaurado();
        subInicio.unsubscribe();
      }
    );

    this.client.publish({
      destination: '/app/chat.conectar',
      body: JSON.stringify({ tempId, nombreUsuario: this.nombreUsuario })
    });
  }

  private cargarHistorial(sesionId: string): void {
    this.http.get<ApiResponse<MensajeHistorial[]>>(
      `${this.historialUrl}/${sesionId}`
    ).subscribe({
      next: res => {
        const historial = res?.data ?? [];
        const base: MensajeUI[] = historial
          .filter(h => !!h.contenido)
          .map(h => ({ remitente: h.remitente, contenido: h.contenido, timestamp: h.timestamp }));
        if (!base.length) return;
        // Conservar mensajes RT que llegaron después del último mensaje del historial
        const ultimoTs = base[base.length - 1].timestamp;
        const rt = this.mensajes$.value.filter(m => m.timestamp > ultimoTs && !!m.contenido);
        this.mensajes$.next([...base, ...rt]);
      },
      error: () => { /* 403 = sesionId expirado → no hacer nada, el WS seguirá sin historial */ }
    });
  }

  private suscribirseAlCanal(sesionId: string): void {
    this.client.subscribe(
      `/topic/chat.usuario.${sesionId}`,
      msg => {
        const evento: EventoUsuario = JSON.parse(msg.body);
        if (evento.tipo === 'SESION_CERRADA') {
          this.sesionCerrada$.next();
        } else if (evento.tipo === 'MENSAJE' && evento.contenido) {
          this.agregarMensaje('ADMIN', evento.contenido, evento.timestamp ?? undefined);
        }
      }
    );
    this.conectado$.next(true);
  }

  private marcarRestaurado(): void {
    clearTimeout(this.timeoutRestaurado);
    this.estadoConexion$.next('restaurado');
    this.timeoutRestaurado = setTimeout(() => {
      this.estadoConexion$.next('conectado');
    }, 3000);
  }

  enviarMensaje(contenido: string): void {
    if (!this.sesionId || !this.client?.active) return;
    this.client.publish({
      destination: '/app/chat.mensaje',
      body: JSON.stringify({ sesionId: this.sesionId, contenido })
    });
    this.agregarMensaje('USUARIO', contenido);
  }

  private agregarMensaje(
    remitente: 'USUARIO' | 'ADMIN',
    contenido: string,
    timestamp?: string
  ): void {
    const ts = timestamp ?? new Date().toISOString().slice(0, 19);
    const actual = this.mensajes$.value;
    this.mensajes$.next([...actual, { remitente, contenido, timestamp: ts }]);
  }

  desconectar(): void {
    clearTimeout(this.timeoutRestaurado);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online',  this.onOnline);
    if (this.client?.active) this.client.deactivate();
    this.sesionId = null;
    sessionStorage.removeItem(SESION_KEY);
    this.mensajes$.next([]);
    this.conectado$.next(false);
    this.estadoConexion$.next('reconectando');
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
