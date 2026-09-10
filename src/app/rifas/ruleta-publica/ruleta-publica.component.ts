import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ArcElement, Chart, PieController } from 'chart.js';
import { IBoletoRifaDto, IPremioPublico, IResultadoSorteoPlataformas } from '../models/boleto-rifa.model';
import { RifaService } from '../service/rifa.service';

Chart.register(ArcElement, PieController, ChartDataLabels);

/**
 * Vista pública de la ruleta: cualquiera con el link la abre, sin sesión.
 *
 * Solo se ve la ruleta, quién va participando y cuántos boletos lleva cada quien.
 * El detalle de cada boleto (URLs de perfil, evidencia de seguimiento y de lo que
 * compartió) NO viaja hasta aquí -- el backend lo recorta en /publico/**.
 *
 * Mientras la rifa sea de PRUEBA cualquiera puede girar para ver el flujo completo.
 * En cuanto el admin la activa como real, los botones desaparecen y el backend
 * rechaza girar/reiniciar por esta vía: la rifa de verdad solo la mueve el admin.
 */
@Component({
  selector: 'app-ruleta-publica',
  templateUrl: './ruleta-publica.component.html',
  styleUrls: ['./ruleta-publica.component.scss']
})
export class RuletaPublicaComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas?: ElementRef<HTMLCanvasElement>;

  rifaId: number | null = null;
  cargando = true;
  error: string | null = null;

  esPrueba = true;
  nombrePremio = '';
  premioId: number | null = null;
  premioMiniatura: string | null = null;

  premioAbierto = false;
  premioCargando = false;
  premio: IPremioPublico | null = null;
  imagenIndice = 0;
  varianteNumeroActual = 0;
  totalVariantes = 0;
  giroActual = 0;
  giroGanador = 0;
  rifaTerminada = false;

  boletosEnJuego: IBoletoRifaDto[] = [];
  boletosDescartados: IBoletoRifaDto[] = [];
  resumenEnJuego: { nombre: string; boletos: number }[] = [];

  sorteando = false;
  descartadoActual: IBoletoRifaDto | null = null;
  ganadorActual: IResultadoSorteoPlataformas | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];

  private chart?: Chart;
  private ruletaSlots: IBoletoRifaDto[] = [];
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rifaService: RifaService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('rifaId'));
    if (!id) { this.cargando = false; this.error = 'Link inválido.'; return; }
    this.rifaId = id;
    this.cargarEstado();
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  cargarEstado(): void {
    if (!this.rifaId) return;
    this.rifaService.getEstadoPublicoPlataformas(this.rifaId).subscribe({
      next: est => {
        this.cargando = false;
        this.esPrueba = !!est.configurarRifa?.esPrueba;
        this.nombrePremio = est.varianteActual?.variante?.nombreProducto ?? '';
        this.premioId = est.varianteActual?.id ?? null;
        // La URL del micro de imágenes: misma foto que se ve en modelos, y la baja el navegador
        // por su cuenta en vez de que el back la mande en base64 dentro del JSON del estado.
        this.premioMiniatura = est.varianteActual?.variante?.imagenUrl ?? null;
        this.varianteNumeroActual = est.varianteNumeroActual;
        this.totalVariantes = est.totalVariantes;
        this.giroActual = est.giroActual;
        this.giroGanador = est.giroGanador;
        this.rifaTerminada = est.rifaTerminada;
        this.boletosEnJuego = est.boletosEnJuego ?? [];
        this.boletosDescartados = est.boletosDescartados ?? [];
        this.resumenEnJuego = this.resumir(this.boletosEnJuego);
        setTimeout(() => this.generarRuleta(), 150);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        // 404 = la rifa no existe o no es la que el negocio tiene publicada. Se manda a
        // la misma pantalla de "página no disponible" que cualquier URL inventada, para
        // que tantear ids (/ruleta/47, /ruleta/46...) no diga nada de lo que hay detrás.
        if (e.status === 404) { this.irA404(); return; }
        this.error = 'No se pudo cargar la ruleta. Verifica el link.';
      }
    });
  }

  // skipLocationChange deja el link tal como lo abrió el visitante: se ve el 404 sin
  // que la barra de direcciones cambie a otra ruta.
  private irA404(): void {
    this.router.navigateByUrl('/pagina-no-disponible', { skipLocationChange: true });
  }

  // ── Detalle del premio ─────────────────────────────────────────────
  // La ficha completa y todas las fotos se piden solo al abrir el detalle: el estado de
  // la ruleta se recarga tras cada giro y mandar la galería ahí multiplicaría el payload.

  abrirPremio(): void {
    if (!this.rifaId || !this.premioId) return;
    this.premioAbierto = true;
    this.imagenIndice = 0;

    if (this.premio?.id === this.premioId) return;   // ya está en memoria

    this.premio = null;
    this.premioCargando = true;
    this.rifaService.getPremioPublico(this.rifaId, this.premioId).subscribe({
      next: p => { this.premio = p; this.premioCargando = false; },
      error: () => { this.premioCargando = false; }
    });
  }

  cerrarPremio(): void { this.premioAbierto = false; }

  @HostListener('document:keydown', ['$event'])
  teclado(evento: KeyboardEvent): void {
    if (!this.premioAbierto) return;
    if (evento.key === 'Escape')     this.cerrarPremio();
    if (evento.key === 'ArrowLeft')  this.imagenAnterior();
    if (evento.key === 'ArrowRight') this.imagenSiguiente();
  }

  get imagenes(): string[] { return this.premio?.imagenes ?? []; }

  // El carrusel da la vuelta en los dos sentidos: con dos o tres fotos, toparse con
  // una flecha muerta se siente roto.
  imagenAnterior(): void {
    if (this.imagenes.length < 2) return;
    this.imagenIndice = (this.imagenIndice - 1 + this.imagenes.length) % this.imagenes.length;
  }

  imagenSiguiente(): void {
    if (this.imagenes.length < 2) return;
    this.imagenIndice = (this.imagenIndice + 1) % this.imagenes.length;
  }

  irAImagen(i: number): void { this.imagenIndice = i; }

  // Deslizar con el dedo: en el celular las flechas quedan chicas y lo natural es
  // arrastrar la foto. Menos de 40 px se toma como un toque, no como un swipe.
  private inicioToqueX: number | null = null;

  inicioToque(evento: TouchEvent): void { this.inicioToqueX = evento.changedTouches[0].clientX; }

  finToque(evento: TouchEvent): void {
    if (this.inicioToqueX === null) return;
    const recorrido = evento.changedTouches[0].clientX - this.inicioToqueX;
    this.inicioToqueX = null;
    if (Math.abs(recorrido) < 40) return;
    if (recorrido > 0) this.imagenAnterior();
    else this.imagenSiguiente();
  }

  /** Los atributos que sí tienen valor, para no pintar filas vacías en la ficha. */
  get fichaPremio(): { etiqueta: string; valor: string }[] {
    const p = this.premio;
    if (!p) return [];
    return [
      { etiqueta: 'Descripción',   valor: p.descripcion ?? '' },
      { etiqueta: 'Marca',         valor: p.marca ?? '' },
      { etiqueta: 'Presentación',  valor: p.presentacion ?? '' },
      { etiqueta: 'Contenido',     valor: p.contenidoNeto ?? '' },
      { etiqueta: 'Talla',         valor: p.talla ?? '' },
      { etiqueta: 'Color',         valor: p.color ?? '' }
    ].filter(f => !!f.valor.trim());
  }

  private resumir(boletos: IBoletoRifaDto[]): { nombre: string; boletos: number }[] {
    const mapa = new Map<number, { nombre: string; boletos: number }>();
    boletos.forEach(b => {
      const actual = mapa.get(b.concursanteId);
      if (actual) { actual.boletos++; }
      else { mapa.set(b.concursanteId, { nombre: b.nombreCompleto, boletos: 1 }); }
    });
    return Array.from(mapa.values()).sort((a, b) => b.boletos - a.boletos);
  }

  private generarRuleta(): void {
    this.chart?.destroy();
    if (!this.boletosEnJuego.length || !this.ruletaCanvas) return;

    this.ruletaSlots = [...this.boletosEnJuego];
    const colorPorPersona = new Map<number, string>();
    const backgroundColor = this.ruletaSlots.map(b => {
      if (!colorPorPersona.has(b.concursanteId)) {
        colorPorPersona.set(b.concursanteId, this.colorAleatorio());
      }
      return colorPorPersona.get(b.concursanteId)!;
    });

    this.chart = new Chart(this.ruletaCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.ruletaSlots.map(b => b.nombreCompleto),
        datasets: [{ data: Array(this.ruletaSlots.length).fill(1), backgroundColor }]
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: 'white', anchor: 'center', align: 'center',
            font: { size: 12, weight: 'bold' },
            formatter: (_, ctx) => ctx.chart.data.labels?.[ctx.dataIndex] ?? ''
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  sortear(): void {
    if (!this.rifaId || this.sorteando || !this.esPrueba || !this.boletosEnJuego.length) return;
    this.sorteando = true;
    this.descartadoActual = null;

    this.rifaService.sortearPublicoPlataformas(this.rifaId).subscribe({
      next: resultado => {
        const idx = this.ruletaSlots.findIndex(b => b.id === resultado.boleto.id);
        setTimeout(() => {
          this.girarAnimacionHacia(idx >= 0 ? idx : 0, () => {
            this.sorteando = false;
            if (resultado.esGanador) {
              this.ganadorActual = resultado;
              this.lanzarConfetti();
              this.cargarEstado();
            } else {
              this.descartadoActual = resultado.boleto;
              setTimeout(() => { this.descartadoActual = null; this.cargarEstado(); }, 2500);
            }
          });
        }, 100);
      },
      error: () => { this.sorteando = false; this.cargarEstado(); }
    });
  }

  reiniciar(): void {
    if (!this.rifaId || !this.esPrueba) return;
    this.rifaService.reiniciarPublicoPlataformas(this.rifaId).subscribe({
      next: () => { this.ganadorActual = null; this.descartadoActual = null; this.cargarEstado(); },
      error: () => this.cargarEstado()
    });
  }

  private girarAnimacionHacia(index: number, onComplete: () => void): void {
    const canvas = this.ruletaCanvas?.nativeElement;
    if (!canvas) { onComplete(); return; }
    const segmentAngle = 360 / (this.ruletaSlots.length || 1);
    const finalRotation = 10 * 360 + (360 - (index * segmentAngle + segmentAngle / 2));
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
    setTimeout(() => {
      canvas.style.transition = `transform ${this.DURACION_ANIMACION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
      canvas.style.transform = `rotate(${finalRotation}deg)`;
      setTimeout(onComplete, this.DURACION_ANIMACION_MS + 100);
    }, 50);
  }

  private lanzarConfetti(): void {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595'];
    this.confettiPieces = Array.from({ length: 100 }, () => ({
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2.5 + Math.random() * 2).toFixed(2)}s`,
      size: `${8 + Math.floor(Math.random() * 8)}px`
    }));
    setTimeout(() => { this.confettiPieces = []; }, 6000);
  }

  private colorAleatorio(): string {
    return '#' + Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  }

  etiquetaBoleto(b: IBoletoRifaDto): string {
    const partes = [b.plataforma, b.motivo].filter(p => !!p);
    return partes.length ? partes.join(' · ') : 'Sin detalle';
  }
}
