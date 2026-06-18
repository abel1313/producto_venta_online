import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { skip, take } from 'rxjs/operators';
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
  hayMasAntiguos = false;
  cargandoMas = false;

  private subs: Subscription[] = [];
  private cargarMasSub: Subscription | null = null;
  private prevMsgCount = 0;

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
      this.chatService.estadoConexion$.subscribe(s => { this.estadoConexion = s; }),
      this.chatService.hayMasAntiguos$.subscribe(v => { this.hayMasAntiguos = v; })
    );

    combineLatest([this.authService.userName$, this.authService.userId$])
      .pipe(take(1))
      .subscribe(([nombre, userId]) => {
        this.chatService.conectar(nombre || 'Visitante', userId || null);
      });
  }

  ngAfterViewChecked(): void {
    const count = this.mensajes.length;
    if (count > this.prevMsgCount && !this.cargandoMas) {
      this.scrollAlFinal();
    }
    this.prevMsgCount = count;
  }

  private scrollAlFinal(): void {
    const el = this.mensajesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  onScroll(): void {
    const el = this.mensajesContainer?.nativeElement;
    if (!el || this.cargandoMas || !this.hayMasAntiguos) return;
    if (el.scrollTop <= 50) {
      this.cargarMasAntiguos();
    }
  }

  cargarMasAntiguos(): void {
    if (this.cargandoMas || !this.hayMasAntiguos) return;
    const el = this.mensajesContainer?.nativeElement;
    const scrollHeightAntes = el?.scrollHeight ?? 0;
    this.cargandoMas = true;

    this.cargarMasSub?.unsubscribe();
    this.cargarMasSub = this.chatService.mensajes$.pipe(skip(1), take(1)).subscribe(() => {
      setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight - scrollHeightAntes;
        this.cargandoMas = false;
      }, 0);
    });

    this.chatService.cargarMasAntiguos();
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
    this.hayMasAntiguos = false;
    this.cargandoMas = false;
    this.prevMsgCount = 0;
    this.chatService.desconectar();
    combineLatest([this.authService.userName$, this.authService.userId$])
      .pipe(take(1))
      .subscribe(([nombre, userId]) => {
        this.chatService.conectar(nombre || 'Visitante', userId || null);
      });
  }

  formatHora(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.cargarMasSub?.unsubscribe();
  }
}
