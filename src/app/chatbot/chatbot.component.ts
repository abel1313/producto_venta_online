import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChatbotService, IMensajeChat, IChatbotResponse, IChatbotProducto, IChatbotBuscarResponse } from './chatbot.service';
import { NegocioService } from '../negocio/negocio.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';
import { IVarianteResumen } from '../variante/models/variante.model';

interface IBurbuja {
  rol:             'user' | 'assistant' | 'typing';
  contenido:       string;
  productos?:      IChatbotProducto[];
  hayMas?:         boolean;
  busquedaQuery?:  string;
  busquedaOffset?: number;
  cargandoMas?:    boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('msgsRef') msgsRef!: ElementRef<HTMLDivElement>;

  minimizado        = true;
  mensajes:         IBurbuja[] = [];
  historial:        IMensajeChat[] = [];
  inputTexto        = '';
  cargando          = false;
  imagenesVariante  = new Map<number, string>();

  // ── Estado de bloqueo ─────────────────────────────────────────────
  inputBloqueado    = false;
  oculto            = false;
  segundosRestantes = 0;

  // ── Estado del negocio ────────────────────────────────────────────
  negocioCerrado = false;
  whatsappUrl:   string | null = null;
  facebookUrl:   string | null = null;

  private countdownInterval: any = null;
  private pendingScroll = false;

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly negocioService: NegocioService,
    readonly carritoService: CarritoVarianteService
  ) {}

  ngOnInit(): void {
    this.negocioService.getEstado().subscribe({
      next: (res: any) => {
        const estado = res.data as any;
        this.negocioCerrado = !estado.abierto;
        this.whatsappUrl    = estado.whatsappUrl;
        this.facebookUrl    = estado.facebookUrl;
      },
      error: () => {}
    });
  }

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
        const burbuja: IBurbuja = {
          rol:             'assistant',
          contenido:       res.respuesta,
          productos:       res.productos,
          hayMas:          res.hayMas,
          busquedaQuery:   res.busquedaQuery,
          busquedaOffset:  res.busquedaOffset
        };
        this.mensajes.push(burbuja);
        this.historial.push({ rol: 'user',      contenido: texto });
        this.historial.push({ rol: 'assistant', contenido: res.respuesta });
        this.cargando      = false;
        this.pendingScroll = true;

        if (res.productos?.length) {
          this.cargarImagenesProductos(res.productos);
        }

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

  // ── Productos ─────────────────────────────────────────────────────

  private cargarImagenesProductos(productos: IChatbotProducto[]): void {
    for (const p of productos) {
      if (!this.imagenesVariante.has(p.varianteId)) {
        this.chatbotService.getImagenVariante(p.varianteId).subscribe(url => {
          if (url) this.imagenesVariante.set(p.varianteId, url);
        });
      }
    }
  }

  verMas(burbuja: IBurbuja): void {
    if (!burbuja.busquedaQuery || burbuja.cargandoMas) return;
    burbuja.cargandoMas = true;
    this.chatbotService.buscar(burbuja.busquedaQuery, burbuja.busquedaOffset ?? 0).subscribe({
      next: (res: IChatbotBuscarResponse) => {
        burbuja.productos      = [...(burbuja.productos ?? []), ...res.productos];
        burbuja.hayMas         = res.hayMas;
        burbuja.busquedaOffset = res.busquedaOffset;
        burbuja.cargandoMas    = false;
        this.pendingScroll     = true;
        this.cargarImagenesProductos(res.productos);
      },
      error: () => { burbuja.cargandoMas = false; }
    });
  }

  agregarAlCarrito(p: IChatbotProducto): void {
    const variante: IVarianteResumen = {
      id:        p.varianteId,
      marca:     p.marca,
      talla:     p.talla,
      color:     p.color,
      precio:    p.precio,
      stock:     p.stock,
      imagenUrl: this.imagenesVariante.get(p.varianteId) ?? null
    };
    this.carritoService.agregar(variante);
  }

  quitarDelCarrito(varianteId: number): void {
    this.carritoService.eliminar(varianteId);
  }

  // ── Cooldown / bloqueo ────────────────────────────────────────────

  private aplicarCooldown(segundos: number, bloqueado: boolean): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.inputBloqueado    = true;
    this.segundosRestantes = segundos;

    if (bloqueado) {
      setTimeout(() => { this.minimizado = true; this.oculto = true; }, 3000);
    }

    this.countdownInterval = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.inputBloqueado    = false;
        this.segundosRestantes = 0;
        if (bloqueado) this.oculto = false;
      }
    }, 1000);
  }

  get labelEspera(): string {
    if (!this.inputBloqueado) return '';
    const min = Math.floor(this.segundosRestantes / 60);
    const seg = this.segundosRestantes % 60;
    return min > 0 ? `⏳ Espera ${min}m ${seg}s` : `⏳ Espera ${seg}s`;
  }

  private scrollBottom(): void {
    try { this.msgsRef.nativeElement.scrollTop = this.msgsRef.nativeElement.scrollHeight; } catch {}
  }
}
