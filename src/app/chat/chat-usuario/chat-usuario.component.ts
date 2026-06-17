import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ChatLiveService } from '../service/chat-live.service';
import { EstadoConexion, MensajeUI } from '../models/chat.models';

@Component({
  selector: 'app-chat-usuario',
  templateUrl: './chat-usuario.component.html',
  styleUrls: ['./chat-usuario.component.scss']
})
export class ChatUsuarioComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('mensajesContainer') mensajesContainer!: ElementRef<HTMLDivElement>;

  mensajes: MensajeUI[] = [];
  conectado = false;
  sesionCerrada = false;
  textoMensaje = '';
  errorConexion: string | null = null;
  estadoConexion: EstadoConexion = 'reconectando';

  private subs: Subscription[] = [];

  constructor(
    public chatService: ChatLiveService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.chatService.mensajes$.subscribe(m => { this.mensajes = m; }),
      this.chatService.conectado$.subscribe(c => { this.conectado = c; }),
      this.chatService.sesionCerrada$.subscribe(() => { this.sesionCerrada = true; }),
      this.chatService.error$.subscribe(e => { this.errorConexion = e; }),
      this.chatService.estadoConexion$.subscribe(s => { this.estadoConexion = s; })
    );

    this.authService.userName$.pipe(take(1)).subscribe(nombre => {
      this.chatService.conectar(nombre || 'Visitante');
    });
  }

  ngAfterViewChecked(): void {
    this.scrollAlFinal();
  }

  private scrollAlFinal(): void {
    const el = this.mensajesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  enviar(): void {
    const texto = this.textoMensaje.trim();
    if (!texto || this.estadoConexion !== 'conectado' || this.sesionCerrada) return;
    this.chatService.enviarMensaje(texto);
    this.textoMensaje = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  reiniciar(): void {
    this.sesionCerrada = false;
    this.errorConexion = null;
    this.chatService.desconectar();
    this.authService.userName$.pipe(take(1)).subscribe(nombre => {
      this.chatService.conectar(nombre || 'Visitante');
    });
  }

  formatHora(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
