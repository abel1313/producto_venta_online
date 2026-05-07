import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { WebSocketServiceService } from 'src/app/socket/web-socket-service.service';
import { IConfigurarRifa, IConfigurarRifaProducto } from '../models/configurar-rifa.model';
import { IConcursante } from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa, IHistorialProducto } from '../models/estado-rifa.model';
import { RifaService } from '../service/rifa.service';

Chart.register(ArcElement, PieController, ChartDataLabels);

type Paso = 'configurar' | 'ruleta' | 'transicion' | 'resumen';

@Component({
  selector: 'app-agregar-rifa',
  templateUrl: './agregar-rifa.component.html',
  styleUrls: ['./agregar-rifa.component.scss']
})
export class AgregarRifaComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef<HTMLCanvasElement>;

  paso: Paso = 'configurar';

  // ── Sección A: Configuración general ──────────────────────────────
  configForm!: FormGroup;
  rifaConfig: IConfigurarRifa | null = null;
  savingConfig = false;
  rifasActivas: IConfigurarRifa[] = [];

  // ── Sección B: Productos de la rifa ───────────────────────────────
  productosRifa: IConfigurarRifaProducto[] = [];
  mostrarFormProducto = false;
  terminoBuscaProducto = '';
  productosBusqueda: IProductoDTO[] = [];
  productoParaAgregar: IProductoDTO | null = null;
  giroGanadorInput = 1;
  permitirNuevosInput = false;
  guardandoProducto = false;
  private busqProdSubject = new Subject<string>();
  private busqProdSub?: Subscription;

  // ── Sección C: Participantes ───────────────────────────────────────
  concursantes: IConcursante[] = [];
  mostrarFormConcursante = false;
  concursanteForm!: FormGroup;
  forzarRegistro = false;
  guardandoConcursante = false;

  // ── Ruleta ─────────────────────────────────────────────────────────
  estado: IEstadoRifa | null = null;
  elegibles: IConcursante[] = [];
  descartados: IConcursante[] = [];
  sorteando = false;
  descartadoActual: IConcursante | null = null;
  ganadorActual: IGanadorRifa | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];

  // ── Modal agregar participante en ruleta ───────────────────────────
  mostrarModalParticipante = false;
  participanteRuletaForm!: FormGroup;
  guardandoParticipanteRuleta = false;

  private chart!: Chart;
  private wsUnsub: (() => void) | null = null;
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly rifaService: RifaService,
    private readonly productoService: ProductoService,
    private readonly webSocketService: WebSocketServiceService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.configForm = this.fb.group({
      fechaHoraLimite: ['', Validators.required],
    });

    this.concursanteForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      palabraRifa:     ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });

    this.participanteRuletaForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      palabraRifa:     ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });

    this.busqProdSub = this.busqProdSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(t => t.length < 3
        ? (this.productosBusqueda = [], EMPTY)
        : this.productoService.getDataNombreCodigoBarra(1, 10, t))
    ).subscribe({ next: res => { this.productosBusqueda = res.t ?? []; } });

    this.cargarRifasActivas();
  }

  ngOnDestroy(): void {
    this.busqProdSub?.unsubscribe();
    this.wsUnsub?.();
    this.chart?.destroy();
  }

  // ── Sección A ──────────────────────────────────────────────────────

  guardarConfiguracion(): void {
    if (this.configForm.invalid) return;
    this.savingConfig = true;

    const payload: IConfigurarRifa = {
      fechaHoraLimite: this.configForm.value.fechaHoraLimite,
      activa: true,
    };

    this.rifaService.configurarRifa(payload).subscribe({
      next: res => {
        this.rifaConfig = res.data;
        this.savingConfig = false;
        this.cargarProductosRifa();
        this.cargarConcursantes();
      },
      error: () => { this.savingConfig = false; },
    });
  }

  // ── Sección B ──────────────────────────────────────────────────────

  onBuscarProducto(event: Event): void {
    const t = (event.target as HTMLInputElement).value;
    this.terminoBuscaProducto = t;
    this.productoParaAgregar = null;
    this.busqProdSubject.next(t);
  }

  seleccionarProductoParaAgregar(p: IProductoDTO): void {
    this.productoParaAgregar = p;
    this.terminoBuscaProducto = p.nombre;
    this.productosBusqueda = [];
  }

  guardarProductoRifa(): void {
    if (!this.productoParaAgregar || !this.rifaConfig?.id || this.giroGanadorInput < 1) return;
    this.guardandoProducto = true;

    const payload: IConfigurarRifaProducto = {
      configurarRifa: { id: this.rifaConfig.id },
      producto: { id: this.productoParaAgregar.idProducto },
      orden: this.productosRifa.length + 1,
      giroGanador: this.giroGanadorInput,
      permitirNuevos: this.permitirNuevosInput,
    };

    this.rifaService.guardarProductoRifa(payload).subscribe({
      next: res => {
        this.productosRifa.push({
          ...res.data,
          producto: { id: this.productoParaAgregar!.idProducto, nombre: this.productoParaAgregar!.nombre }
        });
        this.resetFormProducto();
        this.guardandoProducto = false;
      },
      error: () => { this.guardandoProducto = false; },
    });
  }

  moverProducto(idx: number, dir: -1 | 1): void {
    const target = idx + dir;
    if (target < 0 || target >= this.productosRifa.length) return;
    [this.productosRifa[idx], this.productosRifa[target]] = [this.productosRifa[target], this.productosRifa[idx]];
    this.productosRifa.forEach((p, i) => p.orden = i + 1);
  }

  private resetFormProducto(): void {
    this.mostrarFormProducto = false;
    this.terminoBuscaProducto = '';
    this.productoParaAgregar = null;
    this.productosBusqueda = [];
    this.giroGanadorInput = 1;
    this.permitirNuevosInput = false;
  }

  // ── Sección C ──────────────────────────────────────────────────────

  agregarConcursante(): void {
    if (this.concursanteForm.invalid || !this.rifaConfig?.id) return;
    this.guardandoConcursante = true;

    const data: IConcursante = {
      ...this.concursanteForm.value,
      configurarRifa: { id: this.rifaConfig.id },
      ordenDesde: 1,
    };

    this.rifaService.registrarConcursante(data, this.forzarRegistro).subscribe({
      next: res => {
        this.concursantes.push(res.data);
        this.concursanteForm.reset();
        this.forzarRegistro = false;
        this.guardandoConcursante = false;
      },
      error: () => { this.guardandoConcursante = false; },
    });
  }

  eliminarConcursante(c: IConcursante): void {
    if (!c.id) return;
    this.rifaService.eliminarConcursante(c.id).subscribe({
      next: () => { this.concursantes = this.concursantes.filter(x => x.id !== c.id); },
    });
  }

  verElegibles(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getElegibles(this.rifaConfig.id).subscribe({
      next: res => { this.elegibles = res.data ?? []; },
    });
  }

  // ── Navegación ─────────────────────────────────────────────────────

  irARuleta(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getEstado(this.rifaConfig.id).subscribe({
      next: res => {
        this.aplicarEstado(res.data);
        this.paso = 'ruleta';
        this.suscribirWebSocket();
        setTimeout(() => this.generarRuleta(), 200);
      },
    });
  }

  // ── Ruleta ─────────────────────────────────────────────────────────

  sortear(): void {
    if (!this.rifaConfig?.id || this.sorteando) return;
    this.sorteando = true;
    this.descartadoActual = null;

    this.rifaService.sortear(this.rifaConfig.id).subscribe({
      next: res => {
        const resultado = res.data;
        const idx = this.elegibles.findIndex(c => c.id === resultado.concursante.id);

        setTimeout(() => {
          this.girarAnimacionHacia(idx >= 0 ? idx : 0, () => {
            this.sorteando = false;

            if (resultado.descartado) {
              this.descartadoActual = resultado.concursante;
              this.descartados.push(resultado.concursante);
              setTimeout(() => {
                this.descartadoActual = null;
                this.elegibles = this.elegibles.filter(c => c.id !== resultado.concursante.id);
                this.actualizarRuleta();

                // Refresca estado para sincronizar giroActual y demás
                this.rifaService.getEstado(this.rifaConfig!.id!).subscribe({
                  next: est => this.aplicarEstadoParcial(est.data),
                });
              }, 2500);
            } else {
              this.ganadorActual = resultado;
              this.lanzarConfetti();
              this.paso = 'transicion';
            }
          });
        }, 100);
      },
      error: () => { this.sorteando = false; },
    });
  }

  continuarSiguienteProducto(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getEstado(this.rifaConfig.id).subscribe({
      next: res => {
        if (res.data.rifaTerminada) {
          this.aplicarEstado(res.data);
          this.paso = 'resumen';
        } else {
          this.aplicarEstado(res.data);
          this.ganadorActual = null;
          this.descartados = [];
          this.paso = 'ruleta';
          setTimeout(() => this.generarRuleta(), 200);
        }
      },
    });
  }

  // ── Modal participante en ruleta ───────────────────────────────────

  abrirModalParticipante(): void {
    this.participanteRuletaForm.reset();
    this.mostrarModalParticipante = true;
  }

  cerrarModalParticipante(): void {
    this.mostrarModalParticipante = false;
  }

  guardarParticipanteRuleta(): void {
    if (this.participanteRuletaForm.invalid || !this.rifaConfig?.id || !this.estado?.productoActual) return;
    this.guardandoParticipanteRuleta = true;

    const data: IConcursante = {
      ...this.participanteRuletaForm.value,
      configurarRifa: { id: this.rifaConfig.id },
      ordenDesde: this.estado.productoActual.orden,
    };

    this.rifaService.registrarConcursante(data).subscribe({
      next: () => {
        this.guardandoParticipanteRuleta = false;
        this.mostrarModalParticipante = false;
        this.rifaService.getEstado(this.rifaConfig!.id!).subscribe({
          next: res => {
            this.aplicarEstado(res.data);
            this.actualizarRuleta();
          },
        });
      },
      error: () => { this.guardandoParticipanteRuleta = false; },
    });
  }

  // ── Reiniciar ──────────────────────────────────────────────────────

  reiniciar(completo: boolean): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.reiniciar(this.rifaConfig.id, completo).subscribe({
      next: () => {
        this.ganadorActual = null;
        this.descartadoActual = null;
        this.confettiPieces = [];
        this.descartados = [];
        if (completo) {
          this.concursantes = [];
          this.elegibles = [];
          this.chart?.destroy();
        } else {
          this.rifaService.getEstado(this.rifaConfig!.id!).subscribe({
            next: res => {
              this.aplicarEstado(res.data);
              this.actualizarRuleta();
            },
          });
        }
        this.paso = 'configurar';
      },
    });
  }

  nuevaRifa(): void {
    this.rifaConfig = null;
    this.productosRifa = [];
    this.concursantes = [];
    this.elegibles = [];
    this.descartados = [];
    this.estado = null;
    this.ganadorActual = null;
    this.descartadoActual = null;
    this.confettiPieces = [];
    this.chart?.destroy();
    this.wsUnsub?.();
    this.wsUnsub = null;
    this.configForm.reset();
    this.concursanteForm.reset();
    this.paso = 'configurar';
    this.cargarRifasActivas();
  }

  // ── Reanudar rifa activa ───────────────────────────────────────────

  retomarRifa(config: IConfigurarRifa): void {
    this.rifaConfig = config;
    this.rifaService.getEstado(config.id!).subscribe({
      next: res => {
        this.aplicarEstado(res.data);
        this.cargarProductosRifa();
        this.cargarConcursantes();
        if (res.data.rifaTerminada) {
          this.paso = 'resumen';
        } else if (res.data.ganador && !res.data.ganador.descartado) {
          this.ganadorActual = res.data.ganador;
          this.paso = 'transicion';
        } else {
          this.paso = 'ruleta';
          this.suscribirWebSocket();
          setTimeout(() => this.generarRuleta(), 200);
        }
      },
    });
  }

  // ── Getters de estado para la UI ───────────────────────────────────

  get productoActualLabel(): string {
    return this.estado?.productoActual?.producto?.nombre ?? '—';
  }

  get productoNumActual(): number {
    return this.estado?.productoNumeroActual ?? 1;
  }

  get totalProductos(): number {
    return this.estado?.totalProductos ?? this.productosRifa.length;
  }

  get giroActual(): number {
    return this.estado?.giroActual ?? 0;
  }

  get giroGanador(): number {
    return this.estado?.giroGanador ?? 0;
  }

  get esGiroGanador(): boolean {
    return this.giroActual === this.giroGanador && this.giroGanador > 0;
  }

  get permitirNuevosActual(): boolean {
    return this.estado?.productoActual?.permitirNuevos ?? false;
  }

  get historial(): IHistorialProducto[] {
    return this.estado?.historial ?? [];
  }

  get puedeIrARuleta(): boolean {
    return !!(this.rifaConfig?.id && this.productosRifa.length > 0 && this.concursantes.length > 0);
  }

  // ── Privados ───────────────────────────────────────────────────────

  private cargarRifasActivas(): void {
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: res => { this.rifasActivas = res.data ?? []; },
      error: () => { this.rifasActivas = []; },
    });
  }

  private cargarProductosRifa(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getProductosDeRifa(this.rifaConfig.id).subscribe({
      next: res => { this.productosRifa = (res.data ?? []).sort((a, b) => a.orden - b.orden); },
    });
  }

  private cargarConcursantes(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getConcursantesPorRifa(this.rifaConfig.id).subscribe({
      next: res => { this.concursantes = res.lista ?? []; },
    });
  }

  private aplicarEstado(estado: IEstadoRifa): void {
    this.estado = estado;
    this.elegibles = estado.elegibles ?? [];
    this.descartados = estado.descartados ?? [];
  }

  private aplicarEstadoParcial(estado: IEstadoRifa): void {
    this.estado = estado;
    // No pisamos elegibles/descartados porque ya los actualizamos localmente
  }

  private actualizarRuleta(): void {
    if (!this.ruletaCanvas) return;
    const canvas = this.ruletaCanvas.nativeElement;
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
    setTimeout(() => this.generarRuleta(), 50);
  }

  private generarRuleta(): void {
    this.chart?.destroy();
    if (!this.elegibles.length || !this.ruletaCanvas) return;

    this.chart = new Chart(this.ruletaCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.elegibles.map(c => `${c.nombre} ${c.apellidoPaterno}`),
        datasets: [{
          data: Array(this.elegibles.length).fill(1),
          backgroundColor: this.elegibles.map(() => this.colorAleatorio()),
        }],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          datalabels: {
            color: 'white',
            anchor: 'center',
            align: 'center',
            font: { size: 13, weight: 'bold' },
            formatter: (_, ctx) => ctx.chart.data.labels?.[ctx.dataIndex] ?? '',
          },
        },
      },
      plugins: [ChartDataLabels],
    });
  }

  private girarAnimacionHacia(index: number, onComplete: () => void): void {
    const canvas = this.ruletaCanvas?.nativeElement;
    if (!canvas) return;
    const segmentAngle = 360 / this.elegibles.length;
    const centerOfTarget = index * segmentAngle + segmentAngle / 2;
    const finalRotation = 10 * 360 + (360 - centerOfTarget);

    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
    setTimeout(() => {
      canvas.style.transition = `transform ${this.DURACION_ANIMACION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
      canvas.style.transform = `rotate(${finalRotation}deg)`;
      setTimeout(onComplete, this.DURACION_ANIMACION_MS + 100);
    }, 50);
  }

  private suscribirWebSocket(): void {
    this.wsUnsub?.();
    this.wsUnsub = this.webSocketService.suscribirRuleta((mensaje: any) => {
      this.ganadorActual = mensaje?.data ?? mensaje;
      this.sorteando = false;
    });
  }

  private lanzarConfetti(): void {
    const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#f06595'];
    this.confettiPieces = Array.from({ length: 100 }, () => ({
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2.5 + Math.random() * 2).toFixed(2)}s`,
      size: `${8 + Math.floor(Math.random() * 8)}px`,
    }));
    setTimeout(() => { this.confettiPieces = []; }, 6000);
  }

  private colorAleatorio(): string {
    return '#' + Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  }
}
