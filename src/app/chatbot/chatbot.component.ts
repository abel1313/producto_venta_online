import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ChatbotService, IMensajeChat, IChatbotResponse } from './chatbot.service';

interface IBurbuja {
  rol: 'user' | 'assistant' | 'typing';
  contenido: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('msgsRef') msgsRef!: ElementRef<HTMLDivElement>;

  minimizado      = true;
  mensajes:       IBurbuja[] = [];
  historial:      IMensajeChat[] = [];
  inputTexto      = '';
  cargando        = false;

  // ── Estado de bloqueo ─────────────────────────────────────────────
  inputBloqueado   = false;   // input/botón deshabilitados temporalmente
  oculto           = false;   // FAB + ventana ocultos (bloqueo de 6h)
  segundosRestantes = 0;      // contador visible en el input

  private countdownInterval: any = null;
  private pendingScroll = false;

  constructor(private readonly chatbotService: ChatbotService) {}

  ngAfterViewChecked(): void {
    if (this.pendingScroll) {
      this.scrollBottom();
      this.pendingScroll = false;
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  // ── UI ────────────────────────────────────────────────────────────

  toggle(): void {
    if (this.oculto) return;
    this.minimizado = !this.minimizado;
    if (!this.minimizado && this.mensajes.length === 0) {
      this.mensajes.push({
        rol: 'assistant',
        contenido: '¡Hola! 👋 Soy tu asistente virtual. Pregúntame sobre productos, precios y disponibilidad.'
      });
    }
    this.pendingScroll = true;
  }

  // ── Envío ─────────────────────────────────────────────────────────

  enviar(): void {
    const texto = this.inputTexto.trim();
    if (!texto || this.cargando || this.inputBloqueado) return;

    this.mensajes.push({ rol: 'user', contenido: texto });
    this.inputTexto = '';
    this.cargando   = true;
    this.mensajes.push({ rol: 'typing', contenido: '' });
    this.pendingScroll = true;

    this.chatbotService.enviar(texto, this.historial.slice(-10)).subscribe({
      next: (res: IChatbotResponse) => {
        this.mensajes = this.mensajes.filter(m => m.rol !== 'typing');
        this.mensajes.push({ rol: 'assistant', contenido: res.respuesta });
        this.historial.push({ rol: 'user',      contenido: texto });
        this.historial.push({ rol: 'assistant', contenido: res.respuesta });
        this.cargando      = false;
        this.pendingScroll = true;

        if (res.segundosEspera > 0) {
          this.aplicarCooldown(res.segundosEspera, res.bloqueado);
        }
      },
      error: () => {
        this.mensajes = this.mensajes.filter(m => m.rol !== 'typing');
        this.mensajes.push({ rol: 'assistant', contenido: '❌ No pude conectar. Intenta de nuevo.' });
        this.cargando      = false;
        this.pendingScroll = true;
      }
    });
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.enviar();
    }
  }

  // ── Lógica de cooldown / bloqueo ──────────────────────────────────

  private aplicarCooldown(segundos: number, bloqueado: boolean): void {
    // Limpiar contador previo si hubiera
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.inputBloqueado   = true;
    this.segundosRestantes = segundos;

    // Si es bloqueo total → ocultar el chat después de 3s (para que el usuario lea el mensaje)
    if (bloqueado) {
      setTimeout(() => {
        this.minimizado = true;
        this.oculto     = true;
      }, 3000);
    }

    // Countdown visible cada segundo
    this.countdownInterval = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.inputBloqueado    = false;
        this.segundosRestantes = 0;
        if (bloqueado) {
          this.oculto = false;   // vuelve a mostrar el FAB
        }
      }
    }, 1000);
  }

  get labelEspera(): string {
    if (!this.inputBloqueado) return '';
    const min = Math.floor(this.segundosRestantes / 60);
    const seg = this.segundosRestantes % 60;
    return min > 0
      ? `⏳ Espera ${min}m ${seg}s`
      : `⏳ Espera ${seg}s`;
  }

  // ── Scroll ────────────────────────────────────────────────────────

  private scrollBottom(): void {
    try {
      this.msgsRef.nativeElement.scrollTop = this.msgsRef.nativeElement.scrollHeight;
    } catch {}
  }
}
