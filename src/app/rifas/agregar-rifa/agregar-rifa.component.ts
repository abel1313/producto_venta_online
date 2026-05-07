import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { WebSocketServiceService } from 'src/app/socket/web-socket-service.service';
import { IConfigurarRifa, IConfigurarRifaVariante } from '../models/configurar-rifa.model';
import { IConcursante, IClientePedido } from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa, IHistorialVariante } from '../models/estado-rifa.model';
import { RifaService, ModoContinuacion } from '../service/rifa.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';

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

  // ── Sección A ──────────────────────────────────────────────────────
  configForm!: FormGroup;
  rifaConfig: IConfigurarRifa | null = null;
  savingConfig = false;
  rifasActivas: IConfigurarRifa[] = [];

  // ── Sección B — variantes ──────────────────────────────────────────
  variantesRifa: IConfigurarRifaVariante[] = [];
  mostrarFormVariante = false;

  // búsqueda de variante
  terminoBusca = '';
  variantesBusqueda: IVarianteResumen[] = [];
  varianteParaAgregar: IVarianteResumen | null = null;
  buscandoVariante = false;
  private busqSubject = new Subject<string>();
  private busqSub?: Subscription;

  // datos del form de variante
  palabraClaveInput = '';
  giroGanadorInput = 1;
  permitirNuevosInput = false;
  guardandoVariante = false;

  // hover modal
  varianteHover: IConfigurarRifaVariante | null = null;
  private hoverTimer: any = null;

  // ── Sección C — participantes ──────────────────────────────────────
  concursantes: IConcursante[] = [];
  palabrasClave: string[] = [];
  mostrarFormParticipante = false;
  concursanteForm!: FormGroup;
  guardandoConcursante = false;

  // importar desde pedidos
  mostrarImportar = false;
  mesSeleccionado = '';
  clientesMes: IClientePedido[] = [];
  clientesSeleccionados = new Set<number>();
  cargandoClientes = false;
  palabraClaveImport = '';
  importando = false;

  // elegibles al presionar "ver elegibles"
  elegiblesVista: IConcursante[] = [];

  // ── Ruleta ─────────────────────────────────────────────────────────
  estado: IEstadoRifa | null = null;
  elegibles: IConcursante[] = [];
  descartados: IConcursante[] = [];
  sorteando = false;
  descartadoActual: IConcursante | null = null;
  ganadorActual: IGanadorRifa | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];

  // ── Transición — opciones ──────────────────────────────────────────
  modoElegido: ModoContinuacion | null = null;
  mostrarFormNuevo = false;
  participanteNuevoForm!: FormGroup;
  guardandoNuevo = false;

  // ── Modal participante en ruleta (permitirNuevos) ──────────────────
  mostrarModalParticipante = false;
  participanteRuletaForm!: FormGroup;
  guardandoParticipanteRuleta = false;

  private chart!: Chart;
  private wsUnsub: (() => void) | null = null;
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly rifaService: RifaService,
    private readonly webSocketService: WebSocketServiceService,
    private readonly fb: FormBuilder,
    readonly router: Router
  ) {}

  ngOnInit(): void {
    this.configForm = this.fb.group({
      fechaHoraLimite: ['', Validators.required],
    });

    this.concursanteForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      palabraClave:    ['', Validators.required],
    });

    this.participanteNuevoForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      palabraClave:    ['', Validators.required],
    });

    this.participanteRuletaForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });

    this.busqSub = this.busqSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(t => {
        if (t.length < 3) { this.variantesBusqueda = []; return EMPTY; }
        this.buscandoVariante = true;
        return this.rifaService.buscarVariante(t).pipe(
          catchError(() => { this.buscandoVariante = false; return EMPTY; })
        );
      })
    ).subscribe({
      next: res => { this.variantesBusqueda = res.t ?? []; this.buscandoVariante = false; }
    });

    // Auto-retomar si viene desde buscar-rifa
    const retomarId = history.state?.retomarRifaId as number | undefined;
    if (retomarId) {
      this._retomar(retomarId);
    } else {
      this.cargarRifasActivas();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.hoverTimer);
    this.busqSub?.unsubscribe();
    this.wsUnsub?.();
    this.chart?.destroy();
  }

  // ── Sección A ──────────────────────────────────────────────────────

  guardarConfiguracion(): void {
    if (this.configForm.invalid) return;
    this.savingConfig = true;
    this.rifaService.configurarRifa({
      fechaHoraLimite: this.configForm.value.fechaHoraLimite,
      activa: true
    }).subscribe({
      next: res => {
        this.rifaConfig = res;
        this.savingConfig = false;
        this.cargarVariantesRifa();
        this.cargarConcursantes();
      },
      error: () => { this.savingConfig = false; }
    });
  }

  // ── Sección B ──────────────────────────────────────────────────────

  onBuscarVariante(event: Event): void {
    const t = (event.target as HTMLInputElement).value;
    this.terminoBusca = t;
    this.varianteParaAgregar = null;
    if (t.length < 3) this.variantesBusqueda = [];
    this.busqSubject.next(t);
  }

  seleccionarVariante(v: IVarianteResumen): void {
    this.varianteParaAgregar = v;
    this.terminoBusca = `${v.nombreProducto ?? ''} ${v.talla ?? ''} ${v.color ?? ''}`.trim();
    this.variantesBusqueda = [];
  }

  guardarVarianteRifa(): void {
    if (!this.varianteParaAgregar || !this.rifaConfig?.id || !this.palabraClaveInput.trim() || this.giroGanadorInput < 1) return;
    this.guardandoVariante = true;

    this.rifaService.guardarVarianteRifa({
      configurarRifaId: this.rifaConfig.id,
      varianteId:       this.varianteParaAgregar.id,
      palabraClave:     this.palabraClaveInput.trim().toUpperCase(),
      giroGanador:      this.giroGanadorInput,
      orden:            this.variantesRifa.length + 1,
      permitirNuevos:   this.permitirNuevosInput
    }).subscribe({
      next: res => {
        this.variantesRifa.push(res);
        this.palabrasClave = this.variantesRifa.map(v => v.palabraClave);
        this.resetFormVariante();
        this.guardandoVariante = false;
      },
      error: () => { this.guardandoVariante = false; }
    });
  }

  eliminarVarianteRifa(v: IConfigurarRifaVariante): void {
    if (!v.id) return;
    this.rifaService.eliminarVarianteRifa(v.id).subscribe({
      next: () => {
        this.variantesRifa = this.variantesRifa.filter(x => x.id !== v.id);
        this.variantesRifa.forEach((x, i) => x.orden = i + 1);
        this.palabrasClave = this.variantesRifa.map(x => x.palabraClave);
      }
    });
  }

  moverVariante(idx: number, dir: -1 | 1): void {
    const t = idx + dir;
    if (t < 0 || t >= this.variantesRifa.length) return;
    [this.variantesRifa[idx], this.variantesRifa[t]] = [this.variantesRifa[t], this.variantesRifa[idx]];
    this.variantesRifa.forEach((v, i) => v.orden = i + 1);
  }

  iniciarHover(v: IConfigurarRifaVariante): void {
    this.hoverTimer = setTimeout(() => { this.varianteHover = v; }, 3000);
  }

  cancelarHover(): void {
    clearTimeout(this.hoverTimer);
  }

  cerrarHover(): void {
    clearTimeout(this.hoverTimer);
    this.varianteHover = null;
  }

  private resetFormVariante(): void {
    this.mostrarFormVariante = false;
    this.terminoBusca = '';
    this.varianteParaAgregar = null;
    this.variantesBusqueda = [];
    this.palabraClaveInput = '';
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
      ordenDesde: 1
    };

    this.rifaService.registrarConcursante(data).subscribe({
      next: res => {
        this.concursantes.push(res);
        this.concursanteForm.reset();
        this.guardandoConcursante = false;
      },
      error: () => { this.guardandoConcursante = false; }
    });
  }

  eliminarConcursante(c: IConcursante): void {
    if (!c.id) return;
    this.rifaService.eliminarConcursante(c.id).subscribe({
      next: () => { this.concursantes = this.concursantes.filter(x => x.id !== c.id); }
    });
  }

  verElegibles(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getElegibles(this.rifaConfig.id).subscribe({
      next: res => { this.elegiblesVista = res; }
    });
  }

  // ── Importar desde pedidos ──────────────────────────────────────────

  cargarClientesMes(): void {
    if (!this.mesSeleccionado) return;
    this.cargandoClientes = true;
    this.clientesMes = [];
    this.clientesSeleccionados.clear();
    this.rifaService.getClientesPorMes(this.mesSeleccionado).subscribe({
      next: res => { this.clientesMes = res; this.cargandoClientes = false; },
      error: () => { this.cargandoClientes = false; }
    });
  }

  toggleClienteSeleccionado(idx: number): void {
    if (this.clientesSeleccionados.has(idx)) {
      this.clientesSeleccionados.delete(idx);
    } else {
      this.clientesSeleccionados.add(idx);
    }
  }

  seleccionarTodosClientes(): void {
    this.clientesMes.forEach((_, i) => this.clientesSeleccionados.add(i));
  }

  importarClientes(): void {
    if (!this.rifaConfig?.id || !this.palabraClaveImport.trim() || this.clientesSeleccionados.size === 0) return;
    this.importando = true;

    const clientes = [...this.clientesSeleccionados].map(i => this.clientesMes[i]);

    this.rifaService.importarDePedidos({
      configurarRifaId: this.rifaConfig.id,
      palabraClave:     this.palabraClaveImport.trim().toUpperCase(),
      ordenDesde:       1,
      clientes
    }).subscribe({
      next: res => {
        this.concursantes.push(...res);
        this.importando = false;
        this.mostrarImportar = false;
        this.clientesMes = [];
        this.clientesSeleccionados.clear();
        this.palabraClaveImport = '';
      },
      error: () => { this.importando = false; }
    });
  }

  // ── Navegación ─────────────────────────────────────────────────────

  irARuleta(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getEstado(this.rifaConfig.id).subscribe({
      next: res => {
        this.aplicarEstado(res);
        this.paso = 'ruleta';
        this.suscribirWebSocket();
        setTimeout(() => this.generarRuleta(), 200);
      }
    });
  }

  retomarRifa(config: IConfigurarRifa): void {
    this._retomar(config.id!);
  }

  // Carga estado → variantes → elegibles (si vacíos) y luego muestra la pantalla correcta
  private _retomar(rifaId: number): void {
    this.rifaService.getEstado(rifaId).subscribe({
      next: res => {
        this.rifaConfig = res.configurarRifa;
        this.aplicarEstado(res);
        this.cargarConcursantes();

        // 1. Carga variantes (para los chips de progreso)
        this.rifaService.getVariantesRifa(rifaId).subscribe({
          next: variantes => {
            this.variantesRifa = variantes.sort((a, b) => a.orden - b.orden);
            this.palabrasClave  = variantes.map(v => v.palabraClave);

            if (res.rifaTerminada) {
              this.paso = 'resumen';
              return;
            }

            this.paso = 'ruleta';
            this.suscribirWebSocket();

            // 2. Si el estado devolvió elegibles vacíos los pide explícitamente
            if (this.elegibles.length > 0) {
              setTimeout(() => this.generarRuleta(), 200);
            } else {
              this.rifaService.getElegibles(rifaId).subscribe({
                next: elegibles => {
                  this.elegibles = elegibles;
                  setTimeout(() => this.generarRuleta(), 200);
                }
              });
            }
          }
        });
      }
    });
  }

  nuevaRifa(): void {
    this.rifaConfig = null;
    this.variantesRifa = [];
    this.concursantes = [];
    this.elegibles = [];
    this.descartados = [];
    this.estado = null;
    this.ganadorActual = null;
    this.descartadoActual = null;
    this.confettiPieces = [];
    this.palabrasClave = [];
    this.chart?.destroy();
    this.wsUnsub?.();
    this.wsUnsub = null;
    this.configForm.reset();
    this.concursanteForm.reset();
    this.paso = 'configurar';
    this.cargarRifasActivas();
  }

  // ── Ruleta ─────────────────────────────────────────────────────────

  sortear(): void {
    if (!this.rifaConfig?.id || this.sorteando) return;
    this.sorteando = true;
    this.descartadoActual = null;

    this.rifaService.sortear(this.rifaConfig.id).subscribe({
      next: resultado => {
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
                // Actualiza giroActual desde el backend
                this.rifaService.getEstado(this.rifaConfig!.id!).subscribe({
                  next: est => { if (this.estado) this.estado.giroActual = est.giroActual; }
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
      error: () => { this.sorteando = false; }
    });
  }

  // ── Transición ─────────────────────────────────────────────────────

  elegirModo(modo: ModoContinuacion): void {
    this.modoElegido = modo;
    if (modo !== 'NUEVOS') {
      this.confirmarContinuar();
    }
    // Si es NUEVOS, se muestra el formulario inline para agregar participantes
  }

  confirmarContinuar(): void {
    if (!this.rifaConfig?.id || !this.modoElegido) return;
    this.rifaService.continuarVariante(this.rifaConfig.id, this.modoElegido).subscribe({
      next: res => {
        if (res.rifaTerminada) {
          this.aplicarEstado(res);
          this.paso = 'resumen';
        } else {
          this.aplicarEstado(res);
          this.ganadorActual = null;
          this.modoElegido = null;
          this.mostrarFormNuevo = false;
          this.paso = 'ruleta';
          setTimeout(() => this.generarRuleta(), 200);
        }
      }
    });
  }

  agregarParticipanteTransicion(): void {
    if (this.participanteNuevoForm.invalid || !this.rifaConfig?.id || !this.estado?.varianteActual) return;
    this.guardandoNuevo = true;

    const data: IConcursante = {
      ...this.participanteNuevoForm.value,
      configurarRifa: { id: this.rifaConfig.id },
      ordenDesde: this.estado.varianteActual.orden
    };

    this.rifaService.registrarConcursante(data).subscribe({
      next: () => {
        this.participanteNuevoForm.reset();
        this.guardandoNuevo = false;
      },
      error: () => { this.guardandoNuevo = false; }
    });
  }

  // ── Modal participante en ruleta (permitirNuevos) ──────────────────

  abrirModalParticipante(): void {
    this.participanteRuletaForm.reset();
    if (this.estado?.varianteActual) {
      this.participanteRuletaForm.patchValue({
        palabraClave: this.estado.varianteActual.palabraClave
      });
    }
    this.mostrarModalParticipante = true;
  }

  cerrarModalParticipante(): void { this.mostrarModalParticipante = false; }

  guardarParticipanteRuleta(): void {
    if (this.participanteRuletaForm.invalid || !this.rifaConfig?.id || !this.estado?.varianteActual) return;
    this.guardandoParticipanteRuleta = true;

    const data: IConcursante = {
      ...this.participanteRuletaForm.value,
      palabraClave:    this.estado.varianteActual.palabraClave,
      configurarRifa:  { id: this.rifaConfig.id },
      ordenDesde:      this.estado.varianteActual.orden
    };

    this.rifaService.registrarConcursante(data).subscribe({
      next: res => {
        this.elegibles.push(res);
        this.actualizarRuleta();
        this.guardandoParticipanteRuleta = false;
        this.mostrarModalParticipante = false;
      },
      error: () => { this.guardandoParticipanteRuleta = false; }
    });
  }

  // ── Reiniciar ──────────────────────────────────────────────────────

  reiniciar(completo: boolean): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.reiniciar(this.rifaConfig.id, completo).subscribe({
      next: () => { this.nuevaRifa(); }
    });
  }

  // ── Getters para la UI ─────────────────────────────────────────────

  get puedeIrARuleta(): boolean {
    return !!(this.rifaConfig?.id && this.variantesRifa.length > 0 && this.concursantes.length > 0);
  }

  get varianteActualNombre(): string {
    const orden = this.estado?.varianteNumeroActual;
    if (!orden) return '—';
    // variantesRifa viene de /porRifa que sí tiene nombreProducto en formato plano
    return this.variantesRifa.find(v => v.orden === orden)?.variante?.nombreProducto
      ?? this.estado?.varianteActual?.variante?.nombreProducto
      ?? '—';
  }

  get giroActual(): number { return this.estado?.giroActual ?? 0; }
  get giroGanador(): number { return this.estado?.giroGanador ?? 0; }
  get esGiroGanador(): boolean { return this.giroActual > 0 && this.giroActual === this.giroGanador; }
  get permitirNuevosActual(): boolean { return this.estado?.varianteActual?.permitirNuevos ?? false; }
  get varianteNumActual(): number { return this.estado?.varianteNumeroActual ?? 1; }
  get totalVariantes(): number { return this.estado?.totalVariantes ?? this.variantesRifa.length; }
  get historial(): IHistorialVariante[] { return this.estado?.historial ?? []; }

  imageSrcVariante(v: IConfigurarRifaVariante): string | null {
    const b64 = v.variante?.imagenBase64;
    if (!b64) return null;
    return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
  }

  // ── Privados ───────────────────────────────────────────────────────

  private cargarRifasActivas(): void {
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: res => { this.rifasActivas = res; },
      error: () => { this.rifasActivas = []; }
    });
  }

  private cargarVariantesRifa(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getVariantesRifa(this.rifaConfig.id).subscribe({
      next: res => {
        this.variantesRifa = res.sort((a, b) => a.orden - b.orden);
        this.palabrasClave = this.variantesRifa.map(v => v.palabraClave);
      }
    });
  }

  private cargarConcursantes(): void {
    if (!this.rifaConfig?.id) return;
    this.rifaService.getConcursantesPorRifa(this.rifaConfig.id).subscribe({
      next: res => { this.concursantes = res; }
    });
  }

  private aplicarEstado(estado: IEstadoRifa): void {
    this.estado    = estado;
    this.elegibles = estado.elegibles ?? [];
    this.descartados = estado.descartados ?? [];
  }

  private actualizarRuleta(): void {
    if (!this.ruletaCanvas) return;
    const c = this.ruletaCanvas.nativeElement;
    c.style.transition = 'none';
    c.style.transform  = 'rotate(0deg)';
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
          backgroundColor: this.elegibles.map(() => this.colorAleatorio())
        }]
      },
      options: {
        responsive: true, animation: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          datalabels: {
            color: 'white', anchor: 'center', align: 'center',
            font: { size: 13, weight: 'bold' },
            formatter: (_, ctx) => ctx.chart.data.labels?.[ctx.dataIndex] ?? ''
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  private girarAnimacionHacia(index: number, onComplete: () => void): void {
    const canvas = this.ruletaCanvas?.nativeElement;
    if (!canvas) return;
    const segmentAngle = 360 / this.elegibles.length;
    const centerOfTarget = index * segmentAngle + segmentAngle / 2;
    const finalRotation = 10 * 360 + (360 - centerOfTarget);
    canvas.style.transition = 'none';
    canvas.style.transform  = 'rotate(0deg)';
    setTimeout(() => {
      canvas.style.transition = `transform ${this.DURACION_ANIMACION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
      canvas.style.transform  = `rotate(${finalRotation}deg)`;
      setTimeout(onComplete, this.DURACION_ANIMACION_MS + 100);
    }, 50);
  }

  private suscribirWebSocket(): void {
    this.wsUnsub?.();
    this.wsUnsub = this.webSocketService.suscribirRuleta((msg: any) => {
      this.ganadorActual = msg?.data ?? msg;
      this.sorteando = false;
    });
  }

  private lanzarConfetti(): void {
    const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8','#f06595'];
    this.confettiPieces = Array.from({ length: 100 }, () => ({
      left:     `${Math.random() * 100}%`,
      color:    colors[Math.floor(Math.random() * colors.length)],
      delay:    `${(Math.random() * 1.5).toFixed(2)}s`,
      duration: `${(2.5 + Math.random() * 2).toFixed(2)}s`,
      size:     `${8 + Math.floor(Math.random() * 8)}px`
    }));
    setTimeout(() => { this.confettiPieces = []; }, 6000);
  }

  private colorAleatorio(): string {
    return '#' + Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  }
}
