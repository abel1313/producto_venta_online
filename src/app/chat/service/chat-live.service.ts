import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ApiResponse, EstadoConexion, EventoUsuario, HistorialPaginado, MensajeUI } from '../models/chat.models';

const SESION_KEY  = 'chatSesionId';
const CLIENTE_KEY = 'chat_cliente_id';

@Injectable({ providedIn: 'root' })
export class ChatLiveService implements OnDestroy {

  private client!: Client;

  sesionId: string | null = null;
  private usuarioId: number | null = null;
  private clienteId: string | null = null;

  private readonly historialBase = `${environment.api_Url}/v1/chat/historial`;

  readonly mensajes$        = new BehaviorSubject<MensajeUI[]>([]);
  readonly conectado$       = new BehaviorSubject<boolean>(false);
  readonly sesionCerrada$   = new Subject<void>();
  readonly error$           = new Subject<string>();
  readonly estadoConexion$  = new BehaviorSubject<EstadoConexion>('reconectando');
  readonly hayMasAntiguos$  = new BehaviorSubject<boolean>(false);

  private paginaActual    = 0;
  private cargandoMasFlag = false;
  private nombreUsuario   = 'Visitante';
  private timeoutRestaurado: any;
  private onOffline = () => this.estadoConexion$.next('sin-internet');
  private onOnline  = () => this.estadoConexion$.next('reconectando');

  constructor(private http: HttpClient) {}

  conectar(nombre: string, usuarioId?: number | null): void {
    if (this.client?.active) return;

    this.nombreUsuario = nombre || 'Visitante';
    this.usuarioId = usuarioId ?? null;

    // clienteId persiste entre sesiones y recargas (une toda la historia del usuario anónimo)
    if (!localStorage.getItem(CLIENTE_KEY)) {
      localStorage.setItem(CLIENTE_KEY, crypto.randomUUID());
    }
    this.clienteId = localStorage.getItem(CLIENTE_KEY)!;

    // sesionId en sessionStorage → re-suscribir al canal WS si existe
    const sesionGuardada = sessionStorage.getItem(SESION_KEY);
    if (sesionGuardada) this.sesionId = sesionGuardada;

    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online',  this.onOnline);

    // Paso 1: cargar historial completo del usuario/cliente ANTES de conectar el WebSocket
    // clienteId cubre todas las sesiones del navegador (incluyendo las previas a usuarioId).
    // usuarioId solo como fallback si localStorage fue borrado.
    const historialUrl = this.clienteId
      ? `${this.historialBase}/cliente/${this.clienteId}?pagina=0&size=20`
      : this.usuarioId
        ? `${this.historialBase}/usuario/${this.usuarioId}?pagina=0&size=20`
        : null;

    if (!historialUrl) {
      this.activarStomp();
      return;
    }

    this.http.get<ApiResponse<HistorialPaginado>>(historialUrl).subscribe({
      next: res => {
        const paginado = res?.data;
        if (paginado) {
          const base: MensajeUI[] = (paginado.mensajes ?? [])
            .filter(h => !!h.contenido)
            .map(h => ({ remitente: h.remitente, contenido: h.contenido, timestamp: h.timestamp }));
          if (base.length) this.mensajes$.next(base);
          this.hayMasAntiguos$.next(paginado.hayMasAntiguos ?? false);
          this.paginaActual = 0;
        }
        // Paso 2: conectar WebSocket con sesionId existente o pedir sesión nueva
        this.activarStomp();
      },
      error: () => {
        // Si falla el historial, conectar igual (puede ser primera visita o error de red)
        this.activarStomp();
      }
    });
  }

  private activarStomp(): void {
    this.client = new Client({
      webSocketFactory: () => new (SockJS as any)(
        `${environment.api_Url}/ws`,
        null,
        { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }
      ),
      reconnectDelay: 15000,
      onConnect:       () => this.onConnect(),
      onDisconnect:    () => { this.conectado$.next(false); },
      onWebSocketClose: () => {
        if (this.estadoConexion$.value !== 'sin-internet') this.estadoConexion$.next('reconectando');
        this.conectado$.next(false);
      },
      onWebSocketError: () => {
        if (this.estadoConexion$.value !== 'sin-internet') this.estadoConexion$.next('reconectando');
      },
      onStompError: () => this.error$.next('Error de conexión con el chat.')
    });

    this.client.activate();
  }

  private onConnect(): void {
    // Reconexión con sesión existente: solo re-suscribir al canal WS
    if (this.sesionId) {
      this.suscribirseAlCanal(this.sesionId);
      this.marcarRestaurado();
      return;
    }

    // Primera conexión: pedir sesión nueva al backend
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

    const payload: Record<string, any> = {
      tempId,
      nombreUsuario: this.nombreUsuario,
      clienteId:     this.clienteId
    };
    if (this.usuarioId) payload['usuarioId'] = this.usuarioId;

    this.client.publish({
      destination: '/app/chat.conectar',
      body: JSON.stringify(payload)
    });
  }

  private suscribirseAlCanal(sesionId: string): void {
    this.client.subscribe(
      `/topic/chat.usuario.${sesionId}`,
      msg => {
        const evento: EventoUsuario = JSON.parse(msg.body);
        if (evento.tipo === 'SESION_CERRADA') {
          // La sesión expiró — limpiar solo el sesionId (clienteId en localStorage persiste)
          this.sesionId = null;
          sessionStorage.removeItem(SESION_KEY);
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

  cargarMasAntiguos(): void {
    if (!this.hayMasAntiguos$.value || this.cargandoMasFlag) return;
    this.cargandoMasFlag = true;

    const url = this.clienteId
      ? `${this.historialBase}/cliente/${this.clienteId}?pagina=${this.paginaActual + 1}&size=20`
      : this.usuarioId
        ? `${this.historialBase}/usuario/${this.usuarioId}?pagina=${this.paginaActual + 1}&size=20`
        : null;

    if (!url) { this.cargandoMasFlag = false; return; }

    this.http.get<ApiResponse<HistorialPaginado>>(url).subscribe({
      next: res => {
        const paginado = res?.data;
        if (paginado) {
          const antiguos: MensajeUI[] = (paginado.mensajes ?? [])
            .filter(h => !!h.contenido)
            .map(h => ({ remitente: h.remitente, contenido: h.contenido, timestamp: h.timestamp }));
          if (antiguos.length) {
            this.mensajes$.next([...antiguos, ...this.mensajes$.value]);
          }
          this.hayMasAntiguos$.next(paginado.hayMasAntiguos ?? false);
          this.paginaActual++;
        }
        this.cargandoMasFlag = false;
      },
      error: () => { this.cargandoMasFlag = false; }
    });
  }

  private agregarMensaje(
    remitente: 'USUARIO' | 'ADMIN',
    contenido: string,
    timestamp?: string
  ): void {
    const ts = timestamp ?? new Date().toISOString().slice(0, 19);
    this.mensajes$.next([...this.mensajes$.value, { remitente, contenido, timestamp: ts }]);
  }

  desconectar(): void {
    clearTimeout(this.timeoutRestaurado);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online',  this.onOnline);
    if (this.client?.active) this.client.deactivate();
    this.sesionId = null;
    sessionStorage.removeItem(SESION_KEY);
    // clienteId en localStorage NO se limpia — persiste entre sesiones
    this.mensajes$.next([]);
    this.conectado$.next(false);
    this.estadoConexion$.next('reconectando');
    this.hayMasAntiguos$.next(false);
    this.paginaActual    = 0;
    this.cargandoMasFlag = false;
    this.usuarioId  = null;
    this.clienteId  = null;
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
