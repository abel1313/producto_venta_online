import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { ChatbotService, IMensajeChat } from './chatbot.service';

interface IBurbuja {
  rol: 'user' | 'assistant' | 'typing';
  contenido: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('msgsRef') msgsRef!: ElementRef<HTMLDivElement>;

  minimizado = true;
  mensajes: IBurbuja[] = [];
  historial: IMensajeChat[] = [];
  inputTexto = '';
  cargando = false;
  private pendingScroll = false;

  constructor(private readonly chatbotService: ChatbotService) {}

  ngAfterViewChecked(): void {
    if (this.pendingScroll) {
      this.scrollBottom();
      this.pendingScroll = false;
    }
  }

  toggle(): void {
    this.minimizado = !this.minimizado;
    if (!this.minimizado && this.mensajes.length === 0) {
      this.mensajes.push({
        rol: 'assistant',
        contenido: '¡Hola! 👋 Soy tu asistente virtual. Pregúntame sobre productos, precios y disponibilidad.'
      });
    }
    this.pendingScroll = true;
  }

  enviar(): void {
    const texto = this.inputTexto.trim();
    if (!texto || this.cargando) return;

    this.mensajes.push({ rol: 'user', contenido: texto });
    this.inputTexto = '';
    this.cargando = true;
    this.mensajes.push({ rol: 'typing', contenido: '' });
    this.pendingScroll = true;

    this.chatbotService.enviar(texto, this.historial.slice(-10)).subscribe({
      next: res => {
        this.mensajes = this.mensajes.filter(m => m.rol !== 'typing');
        this.mensajes.push({ rol: 'assistant', contenido: res.respuesta });
        this.historial.push({ rol: 'user', contenido: texto });
        this.historial.push({ rol: 'assistant', contenido: res.respuesta });
        this.cargando = false;
        this.pendingScroll = true;
      },
      error: () => {
        this.mensajes = this.mensajes.filter(m => m.rol !== 'typing');
        this.mensajes.push({ rol: 'assistant', contenido: '❌ No pude conectar. Intenta de nuevo.' });
        this.cargando = false;
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

  private scrollBottom(): void {
    try {
      this.msgsRef.nativeElement.scrollTop = this.msgsRef.nativeElement.scrollHeight;
    } catch {}
  }
}
