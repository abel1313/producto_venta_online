import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ArcElement, Chart, PieController } from 'chart.js';
import { IClientePedido, IOmitidoYaRegistrado } from '../models/concursante.model';
import { IConcursante } from '../models/concursante.model';
import { IConfigurarRifa, IConfigurarRifaVariante, IConfigurarRifaVarianteRequest } from '../models/configurar-rifa.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { RifaService } from '../service/rifa.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

Chart.register(ArcElement, PieController, ChartDataLabels);

type PasoMes = 'mes' | 'participantes' | 'variante' | 'ruleta' | 'ganador';

@Component({
  selector: 'app-rifa-mes',
  templateUrl: './rifa-mes.component.html',
  styleUrls: ['./rifa-mes.component.scss']
})
export class RifaMesComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('searchWrapVariante') searchWrapVariante?: ElementRef<HTMLElement>;

  paso: PasoMes = 'mes';

  // ── Paso 1: Mes ────────────────────────────────────────────────────
  mesSeleccionado = '';
  fechaHoraLimite = '';
  palabraClave    = 'RIFA';
  esPrueba = true;
  cargandoClientes = false;
  creandoRifa = false;
  clientesMes: IClientePedido[] = [];
  clientesSeleccionados = new Set<number>();

  // ── Paso 2: Participantes ──────────────────────────────────────────
  rifaConfig: IConfigurarRifa | null = null;
  concursantes: IConcursante[] = [];
  guardandoConcursante = false;
  manualForm!: FormGroup;
  mostrarManual = false;
  omitidosImport: IOmitidoYaRegistrado[] = [];
  omitidosSinNombre: IClientePedido[] = [];
  errorConcursante: string | null = null;
  cambiandoModoPrueba = false;

  // ── Paso 3: Variante ───────────────────────────────────────────────
  terminoBusca = '';
  variantesBusqueda: IVarianteResumen[] = [];
  varianteSeleccionada: IVarianteResumen | null = null;
  buscandoVariante = false;
  giroGanador = 1;
  permitirNuevos = false;
  varianteRifa: IConfigurarRifaVariante | null = null;
  guardandoVariante = false;
  private busqSub?: Subscription;
  private busqSubject = new Subject<string>();

  // ── Paso 4: Ruleta ─────────────────────────────────────────────────
  elegibles: IConcursante[] = [];
  descartados: IConcursante[] = [];
  sorteando = false;
  descartadoActual: IConcursante | null = null;
  ganador: IGanadorRifa | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];
  private chart!: Chart;
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly rifaService: RifaService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.manualForm = this.fb.group({
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
  }

  ngOnDestroy(): void {
    this.busqSub?.unsubscribe();
    this.chart?.destroy();
  }

  // ── Paso 1: cargar clientes del mes ───────────────────────────────

  cargarClientes(): void {
    if (!this.mesSeleccionado) return;
    this.cargandoClientes = true;
    this.errorConcursante = null;
    this.clientesMes = [];
    this.clientesSeleccionados.clear();
    this.rifaService.getClientesPorMes(this.mesSeleccionado).subscribe({
      next: res => { this.clientesMes = res; this.cargandoClientes = false; },
      error: err => {
        this.cargandoClientes = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los clientes del mes.';
      }
    });
  }

  toggleCliente(idx: number): void {
    if (this.clientesSeleccionados.has(idx)) {
      this.clientesSeleccionados.delete(idx);
    } else {
      this.clientesSeleccionados.add(idx);
    }
  }

  seleccionarTodos(): void {
    this.clientesMes.forEach((_, i) => this.clientesSeleccionados.add(i));
  }

  deseleccionarTodos(): void { this.clientesSeleccionados.clear(); }

  // ── Crear rifa e importar participantes ───────────────────────────

  crearRifaEImportar(): void {
    if (!this.mesSeleccionado || !this.fechaHoraLimite || !this.palabraClave.trim() || this.creandoRifa) return;
    this.creandoRifa = true;
    this.errorConcursante = null;

    this.rifaService.configurarRifa({
      fechaHoraLimite: this.fechaHoraLimite,
      activa: true,
      tipo: 'MENSUAL',
      mesReferencia: this.mesSeleccionado,
      esPrueba: this.esPrueba
    }).subscribe({
      next: rifa => {
        this.rifaConfig = rifa;
        const clientesSelec = [...this.clientesSeleccionados].map(i => this.clientesMes[i]);

        this.rifaService.importarDePedidos({
          configurarRifaId: rifa.id!,
          palabraClave:     this.palabraClave.trim().toUpperCase(),
          ordenDesde:       1,
          mes:              this.mesSeleccionado,
          clientes:         clientesSelec
        }).subscribe({
          next: res => {
            this.concursantes = res.importados;
            this.omitidosImport = res.omitidosYaRegistrados ?? [];
            this.omitidosSinNombre = res.omitidosSinNombre ?? [];
            this.creandoRifa = false;
            this.paso = 'participantes';
          },
          error: err => {
            this.creandoRifa = false;
            this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron importar los participantes.';
          }
        });
      },
      error: err => {
        this.creandoRifa = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo crear la rifa.';
      }
    });
  }

  cerrarOmitidosImport(): void {
    this.omitidosImport = [];
  }

  get omitidosNombres(): string {
    return this.omitidosImport.map(o => o.nombre).join(', ');
  }

  cerrarOmitidosSinNombre(): void {
    this.omitidosSinNombre = [];
  }

  toggleModoPrueba(): void {
    if (!this.rifaConfig?.id || this.cambiandoModoPrueba) return;
    const rifaId = this.rifaConfig.id;
    const nuevoValor = !this.rifaConfig.esPrueba;

    if (!nuevoValor) {
      const confirmado = confirm(
        '¿Deseas pasar esta rifa al modo REAL?\n\n' +
        'Se restablecerán los descartes (los mismos participantes vuelven a estar ' +
        'disponibles) y se borrarán los giros de prueba. El sorteo comenzará desde ' +
        'cero con los mismos participantes.'
      );
      if (!confirmado) return;
    }

    this.cambiandoModoPrueba = true;
    this.errorConcursante = null;
    this.rifaService.setEsPrueba(rifaId, nuevoValor).subscribe({
      next: res => {
        this.rifaConfig = res;
        this.rifaService.getConcursantesPorRifa(rifaId).subscribe({
          next: concursantes => { this.concursantes = concursantes; }
        });

        if (!nuevoValor && this.varianteRifa) {
          // El back ya reactivó descartados y limpió los giros de prueba —
          // resincronizamos elegibles y reiniciamos la ruleta para el sorteo real.
          this.ganador = null;
          this.descartadoActual = null;
          this.descartados = [];
          this.rifaService.getElegibles(rifaId).subscribe({
            next: elegibles => {
              this.elegibles = elegibles;
              this.cambiandoModoPrueba = false;
              this.paso = 'ruleta';
              setTimeout(() => this.actualizarRuleta(), 200);
            },
            error: err => {
              this.cambiandoModoPrueba = false;
              this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los elegibles.';
            }
          });
        } else {
          this.cambiandoModoPrueba = false;
        }
      },
      error: err => {
        this.cambiandoModoPrueba = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo cambiar el modo de prueba.';
      }
    });
  }

  // ── Paso 2: participantes manuales ────────────────────────────────

  agregarManual(): void {
    if (this.manualForm.invalid || !this.rifaConfig?.id) return;
    this.guardandoConcursante = true;
    this.errorConcursante = null;

    const data: IConcursante = {
      ...this.manualForm.value,
      palabraClave:   this.palabraClave.trim().toUpperCase(),
      configurarRifa: { id: this.rifaConfig.id },
      ordenDesde:     1
    };

    this.rifaService.registrarConcursante(data).subscribe({
      next: res => {
        this.concursantes.push(res);
        this.manualForm.reset();
        this.guardandoConcursante = false;
        this.mostrarManual = false;
      },
      error: err => {
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo agregar el participante.';
        this.guardandoConcursante = false;
      }
    });
  }

  eliminarConcursante(c: IConcursante): void {
    if (!c.id) return;
    this.errorConcursante = null;
    this.rifaService.eliminarConcursante(c.id).subscribe({
      next: () => { this.concursantes = this.concursantes.filter(x => x.id !== c.id); },
      error: err => {
        this.errorConcursante = err?.error?.mensaje
          ?? 'No se puede eliminar: el concursante ya participó en un sorteo';
      }
    });
  }

  // ── Paso 3: variante ──────────────────────────────────────────────

  onBuscarVariante(event: Event): void {
    const t = (event.target as HTMLInputElement).value;
    this.terminoBusca = t;
    this.varianteSeleccionada = null;
    if (t.length < 3) this.variantesBusqueda = [];
    this.busqSubject.next(t);
  }

  seleccionarVariante(v: IVarianteResumen): void {
    this.varianteSeleccionada = v;
    this.terminoBusca = `${v.nombreProducto ?? ''} ${v.talla ?? ''} ${v.color ?? ''}`.trim();
    this.variantesBusqueda = [];
  }

  // El dropdown se posiciona como `fixed` (vía getBoundingClientRect) para no
  // quedar recortado por el `overflow: hidden` de `.rm-card`.
  get dropdownStyleVariante(): { [key: string]: string | number } {
    const el = this.searchWrapVariante?.nativeElement;
    if (!el) return {};
    const r = el.getBoundingClientRect();
    return {
      position: 'fixed',
      'top.px': r.bottom + 4,
      'left.px': r.left,
      'width.px': r.width
    };
  }

  guardarVariante(): void {
    if (!this.varianteSeleccionada || !this.rifaConfig?.id || this.giroGanador < 1 || this.guardandoVariante) return;
    this.guardandoVariante = true;
    this.errorConcursante = null;

    const req: IConfigurarRifaVarianteRequest = {
      configurarRifaId: this.rifaConfig.id,
      varianteId:       this.varianteSeleccionada.id,
      palabraClave:     this.palabraClave.trim().toUpperCase(),
      giroGanador:      this.giroGanador,
      orden:            1,
      permitirNuevos:   this.permitirNuevos
    };

    this.rifaService.guardarVarianteRifa(req).subscribe({
      next: res => {
        this.varianteRifa = res;
        const rifaId = this.rifaConfig!.id!;

        // guardandoVariante sigue en true hasta que termine TODO el flujo (incluye
        // reiniciar + getElegibles) — evita que un segundo clic reenvíe la misma
        // palabraClave (ya guardada) mientras esta llamada sigue en vuelo.
        const cargarElegibles = () => {
          this.rifaService.getElegibles(rifaId).subscribe({
            next: elegibles => {
              this.elegibles = elegibles;
              this.descartados = [];
              this.guardandoVariante = false;
              this.paso = 'ruleta';
              setTimeout(() => this.generarRuleta(), 200);
            },
            error: err => {
              this.guardandoVariante = false;
              this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los elegibles.';
            }
          });
        };

        if (this.rifaConfig?.esPrueba) {
          // En modo prueba, (re)confirmar el premio reinicia el sorteo
          // (descartado=false para todos, sin borrar concursantes) para poder
          // repetir la prueba con los mismos concursantes sin pasar antes por
          // "🔄 Reiniciar (mismos participantes)".
          this.ganador = null;
          this.descartadoActual = null;
          this.rifaService.reiniciar(rifaId, false).subscribe({
            next: () => cargarElegibles(),
            error: err => {
              this.guardandoVariante = false;
              this.errorConcursante = err?.error?.mensaje ?? 'No se pudo reiniciar el sorteo.';
            }
          });
        } else {
          cargarElegibles();
        }
      },
      error: err => {
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo guardar el premio.';
        this.guardandoVariante = false;
      }
    });
  }

  // ── Paso 4: ruleta ────────────────────────────────────────────────

  sortear(): void {
    if (!this.rifaConfig?.id || this.sorteando || this.elegibles.length === 0) return;
    this.sorteando = true;
    this.descartadoActual = null;
    this.errorConcursante = null;

    this.rifaService.sortear(this.rifaConfig.id).subscribe({
      next: resultado => {
        const idx = this.elegibles.findIndex(c => c.id === resultado.concursante.id);
        setTimeout(() => {
          this.girarAnimacionHacia(idx >= 0 ? idx : 0, () => {
            this.sorteando = false;

            if (resultado.descartado) {
              this.descartadoActual = resultado.concursante;
              setTimeout(() => {
                this.descartadoActual = null;
                this.elegibles = this.elegibles.filter(c => c.id !== resultado.concursante.id);
                this.descartados = [...this.descartados, resultado.concursante];
                this.actualizarRuleta();
              }, 2500);
            } else {
              this.ganador = resultado;
              this.paso = 'ganador';
              this.lanzarConfetti();
            }
          });
        }, 100);
      },
      error: err => {
        this.sorteando = false;
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo realizar el sorteo.';
      }
    });
  }

  reiniciar(): void {
    if (!this.rifaConfig?.id) return;
    this.errorConcursante = null;
    this.rifaService.reiniciar(this.rifaConfig.id, false).subscribe({
      next: () => {
        this.ganador = null;
        this.descartadoActual = null;
        this.descartados = [];
        this.rifaService.getElegibles(this.rifaConfig!.id!).subscribe({
          next: elegibles => {
            this.elegibles = elegibles;
            this.paso = 'ruleta';
            setTimeout(() => this.actualizarRuleta(), 200);
          }
        });
      },
      error: err => {
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudo reiniciar el sorteo.';
      }
    });
  }

  volverASorteo(): void {
    if (!this.rifaConfig?.id) return;
    this.errorConcursante = null;
    this.rifaService.getElegibles(this.rifaConfig.id).subscribe({
      next: elegibles => {
        this.elegibles = elegibles;
        this.ganador = null;
        this.descartadoActual = null;
        this.paso = 'ruleta';
        setTimeout(() => this.actualizarRuleta(), 200);
      },
      error: err => {
        this.errorConcursante = err?.error?.mensaje ?? 'No se pudieron cargar los elegibles.';
      }
    });
  }

  nueva(): void {
    this.paso = 'mes';
    this.rifaConfig = null;
    this.concursantes = [];
    this.elegibles = [];
    this.descartados = [];
    this.ganador = null;
    this.descartadoActual = null;
    this.varianteRifa = null;
    this.varianteSeleccionada = null;
    this.clientesMes = [];
    this.clientesSeleccionados.clear();
    this.confettiPieces = [];
    this.omitidosImport = [];
    this.omitidosSinNombre = [];
    this.mesSeleccionado = '';
    this.fechaHoraLimite = '';
    this.esPrueba = true;
    this.cambiandoModoPrueba = false;
    this.errorConcursante = null;
    this.terminoBusca = '';
    this.chart?.destroy();
  }

  // ── Privados ───────────────────────────────────────────────────────

  imageSrc(v: IVarianteResumen | null): string | null {
    if (!v?.imagenBase64) return null;
    return v.imagenBase64.startsWith('data:') ? v.imagenBase64 : `data:image/jpeg;base64,${v.imagenBase64}`;
  }

  nombreCompleto(c?: { nombre?: string | null; apellidoPaterno?: string | null } | null): string {
    if (!c) return '';
    return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
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
        labels: this.elegibles.map(c => this.nombreCompleto(c)),
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
    const finalRotation = 10 * 360 + (360 - (index * segmentAngle + segmentAngle / 2));
    canvas.style.transition = 'none';
    canvas.style.transform  = 'rotate(0deg)';
    setTimeout(() => {
      canvas.style.transition = `transform ${this.DURACION_ANIMACION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
      canvas.style.transform  = `rotate(${finalRotation}deg)`;
      setTimeout(onComplete, this.DURACION_ANIMACION_MS + 100);
    }, 50);
  }

  private lanzarConfetti(): void {
    const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8'];
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
