import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Client, StompSubscription } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ApiResponse, EstadoConexion, EventoUsuario, HistorialPaginado, MensajeUI, nowLocalIso } from '../models/chat.models';

const SESION_KEY = 'chatSesionId';

@Injectable({ providedIn: 'root' })
export class ChatLiveService implements OnDestroy {

  private client!: Client;

  sesionId: string | null = null;
  private usuarioId: number | null = null;

  private readonly historialBase = `${environment.api_Url}/v1/chat/historial/usuario`;

  readonly mensajes$       = new BehaviorSubject<MensajeUI[]>([]);
  readonly conectado$      = new BehaviorSubject<boolean>(false);
  readonly sesionCerrada$  = new Subject<void>();
  readonly error$          = new Subject<string>();
  readonly estadoConexion$ = new BehaviorSubject<EstadoConexion>('reconectando');
  readonly hayMasAntiguos$ = new BehaviorSubject<boolean>(false);

  private paginaActual    = 0;
  private cargandoMasFlag = false;
  private nombreUsuario   = '';
  // Mensajes escritos mientras no había sesión válida. Se envían al quedar lista la nueva.
  private pendientes: string[] = [];
  private reintentosSesion = 0;
  // Se guarda para poder soltarla antes de volver a suscribirse. Ahora el back reusa el mismo
  // sesionId del usuario, así que sin esto una reconexión dejaba DOS suscripciones vivas al mismo
  // canal y cada mensaje del admin se pintaba duplicado.
  private subCanal: StompSubscription | null = null;
  private timeoutRestaurado: any;
  private onOffline = () => this.estadoConexion$.next('sin-internet');
  private onOnline  = () => this.estadoConexion$.next('reconectando');

  constructor(private http: HttpClient) {}

  conectar(nombre: string, usuarioId?: number | null): void {
    if (this.client?.active) return;
    if (!usuarioId) return; // solo usuarios autenticados

    this.nombreUsuario = nombre || '';
    this.usuarioId = usuarioId;

    // Siempre arrancar con sesión limpia: el sessionStorage puede tener un
    // sesionId de una sesión CERRADA en el back (expiró por inactividad mientras
    // el tab estaba cerrado). El historial se recupera por usuarioId vía REST,
    // no por sesionId — así que descartar el sesionId viejo es seguro.
    // Para reconexiones mid-session (caída de red dentro de la misma tab),
    // this.sesionId ya está en memoria → onConnect() lo reutiliza sin problema.
    sessionStorage.removeItem(SESION_KEY);
    this.sesionId = null;

    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online',  this.onOnline);

    // Paso 1: cargar historial por usuarioId ANTES de conectar el WebSocket
    this.cargarHistorial(0, () => this.activarStomp());
  }

  private cargarHistorial(pagina: number, callback?: () => void): void {
    const url = `${this.historialBase}/${this.usuarioId}?pagina=${pagina}&size=20`;
    this.http.get<ApiResponse<HistorialPaginado>>(url).subscribe({
      next: res => {
        const paginado = res?.data;
        if (paginado) {
          const mensajes: MensajeUI[] = (paginado.mensajes ?? [])
            .filter(h => !!h.contenido)
            .map(h => ({ remitente: h.remitente, contenido: h.contenido, timestamp: h.timestamp }));
          if (pagina === 0) {
            if (mensajes.length) this.mensajes$.next(mensajes);
          } else {
            if (mensajes.length) this.mensajes$.next([...mensajes, ...this.mensajes$.value]);
          }
          this.hayMasAntiguos$.next(paginado.hayMasAntiguos ?? false);
          this.paginaActual = pagina;
        }
        callback?.();
      },
      error: () => callback?.()
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
      onConnect:        () => this.onConnect(),
      onDisconnect:     () => { this.conectado$.next(false); },
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
    if (this.sesionId) {
      this.suscribirseAlCanal(this.sesionId);
      this.marcarRestaurado();
      return;
    }
    this.iniciarNuevaSesion();
  }

  private iniciarNuevaSesion(): void {
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
      body: JSON.stringify({
        tempId,
        nombreUsuario: this.nombreUsuario,
        usuarioId:     this.usuarioId
      })
    });
  }

  private suscribirseAlCanal(sesionId: string): void {
    this.subCanal?.unsubscribe();
    this.subCanal = this.client.subscribe(`/topic/chat.usuario.${sesionId}`, msg => {
      const evento: EventoUsuario = JSON.parse(msg.body);
      if (evento.tipo === 'SESION_CERRADA') {
        this.sesionId = null;
        sessionStorage.removeItem(SESION_KEY);
        this.sesionCerrada$.next();
        // El back rechaza la sesión cuando ya no existe en la base. Si quedaba algo por mandar se
        // abre una sesión nueva para entregarlo; el contador evita insistir para siempre.
        if (this.pendientes.length && this.client?.active && this.reintentosSesion < 2) {
          this.reintentosSesion++;
          this.iniciarNuevaSesion();
        }
      } else if (evento.tipo === 'MENSAJE' && evento.contenido) {
        // Puede venir del asistente (BOT) o de una persona (ADMIN). Antes se asumía ADMIN siempre.
        this.agregarMensaje(evento.remitente === 'BOT' ? 'BOT' : 'ADMIN', evento.contenido, evento.timestamp ?? undefined);
      }
    });
    this.conectado$.next(true);
    this.vaciarPendientes();
  }

  private marcarRestaurado(): void {
    clearTimeout(this.timeoutRestaurado);
    this.estadoConexion$.next('restaurado');
    this.timeoutRestaurado = setTimeout(() => {
      this.estadoConexion$.next('conectado');
    }, 3000);
  }

  enviarMensaje(contenido: string): void {
    if (!contenido?.trim()) return;

    if (!this.sesionId) {
      // Sesión expirada (5 min de silencio). Antes se abría una sesión nueva pero el mensaje que
      // el cliente acababa de escribir se tiraba: nunca llegaba al admin y el cliente no se
      // enteraba. Ahora se guarda y se manda solo en cuanto la sesión nueva queda lista.
      this.pendientes.push(contenido);
      if (this.client?.active) {
        this.cargarHistorial(0, () => this.iniciarNuevaSesion());
      }
      return;
    }

    this.publicar(contenido);
  }

  private publicar(contenido: string): void {
    this.client.publish({
      destination: '/app/chat.mensaje',
      body: JSON.stringify({ sesionId: this.sesionId, contenido })
    });
    this.agregarMensaje('USUARIO', contenido);
  }

  private vaciarPendientes(): void {
    if (!this.sesionId || !this.pendientes.length) return;
    const cola = [...this.pendientes];
    this.pendientes = [];
    this.reintentosSesion = 0;
    cola.forEach(contenido => this.publicar(contenido));
  }

  cargarMasAntiguos(): void {
    if (!this.hayMasAntiguos$.value || this.cargandoMasFlag || !this.usuarioId) return;
    this.cargandoMasFlag = true;
    this.cargarHistorial(this.paginaActual + 1, () => { this.cargandoMasFlag = false; });
  }

  private agregarMensaje(remitente: 'USUARIO' | 'ADMIN' | 'BOT', contenido: string, timestamp?: string): void {
    const ts = timestamp ?? nowLocalIso();
    this.mensajes$.next([...this.mensajes$.value, { remitente, contenido, timestamp: ts }]);
  }

  desconectar(): void {
    clearTimeout(this.timeoutRestaurado);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online',  this.onOnline);
    this.subCanal?.unsubscribe();
    this.subCanal = null;
    if (this.client?.active) this.client.deactivate();
    this.sesionId = null;
    sessionStorage.removeItem(SESION_KEY);
    this.mensajes$.next([]);
    this.conectado$.next(false);
    this.estadoConexion$.next('reconectando');
    this.hayMasAntiguos$.next(false);
    this.paginaActual    = 0;
    this.cargandoMasFlag = false;
    this.usuarioId       = null;
    this.pendientes      = [];
    this.reintentosSesion = 0;
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}
