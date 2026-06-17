import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthenticateService } from 'src/app/auth.service';
import { ChatAdminService, SesionUI } from 'src/app/chat/service/chat-admin.service';

@Component({
  selector: 'app-chat-admin',
  templateUrl: './chat-admin.component.html',
  styleUrls: ['./chat-admin.component.scss']
})
export class ChatAdminComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef<HTMLDivElement>;

  sesiones: SesionUI[] = [];
  sesionActiva: SesionUI | null = null;
  conectado = false;
  textoRespuesta = '';
  errorConexion: string | null = null;

  private subs: Subscription[] = [];
  private prevMsgCount = 0;

  constructor(
    public adminChatService: ChatAdminService,
    private authService: AuthenticateService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.adminChatService.sesiones$.subscribe(sesiones => {
        const anterior = this.sesiones;
        this.sesiones = sesiones;
        if (this.sesionActiva) {
          this.sesionActiva = sesiones.find(s => s.sesionId === this.sesionActiva!.sesionId) ?? null;
        }
        // sonido si alguna sesión aumentó sus noLeidos
        const hayNuevo = sesiones.some(s => {
          const prev = anterior.find(a => a.sesionId === s.sesionId);
          return s.noLeidos > 0 && (!prev || s.noLeidos > prev.noLeidos);
        });
        if (hayNuevo) this.playNotificationSound();
      }),
      this.adminChatService.conectado$.subscribe(c => { this.conectado = c; }),
      this.adminChatService.error$.subscribe(e => { this.errorConexion = e; })
    );

    const token = this.authService.getAccessToken();
    if (token) this.adminChatService.conectar(token);
  }

  ngAfterViewChecked(): void {
    const msgs = this.sesionActiva?.mensajes?.length ?? 0;
    if (msgs !== this.prevMsgCount) {
      this.prevMsgCount = msgs;
      const el = this.mensajesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  seleccionarSesion(sesion: SesionUI): void {
    this.sesionActiva = sesion;
    this.prevMsgCount = 0;
    this.adminChatService.marcarLeido(sesion.sesionId);
    this.adminChatService.cargarHistorial(sesion.sesionId);
  }

  responder(): void {
    const texto = this.textoRespuesta.trim();
    if (!texto || !this.sesionActiva || !this.conectado) return;
    this.adminChatService.responder(this.sesionActiva.sesionId, texto);
    this.textoRespuesta = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.responder();
    }
  }

  cerrarSesion(sesion: SesionUI): void {
    if (!confirm(`¿Cerrar el chat de ${sesion.nombreUsuario}?`)) return;
    this.adminChatService.cerrarSesion(sesion.sesionId);
    if (this.sesionActiva?.sesionId === sesion.sesionId) {
      this.sesionActiva = null;
    }
  }

  private playNotificationSound(): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* autoplay policy bloqueado — sin sonido, sin crash */ }
  }

  formatHora(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.adminChatService.desconectar();
  }
}
