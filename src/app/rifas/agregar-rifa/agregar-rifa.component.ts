import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ArcElement, Chart, PieController } from 'chart.js';
import { switchMap } from 'rxjs/operators';
import { IProductoDTO } from 'src/app/productos/producto/models';
import { ProductoService } from 'src/app/productos/service/producto.service';
import { WebSocketServiceService } from 'src/app/socket/web-socket-service.service';
import { IConfigurarRifa } from '../models/configurar-rifa.model';
import { IConcursante } from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { RifaService } from '../service/rifa.service';

Chart.register(ArcElement, PieController, ChartDataLabels);

@Component({
  selector: 'app-agregar-rifa',
  templateUrl: './agregar-rifa.component.html',
  styleUrls: ['./agregar-rifa.component.scss']
})
export class AgregarRifaComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef<HTMLCanvasElement>;

  // Estado general
  paso: 'configurar' | 'concursantes' = 'configurar';
  rifaConfig: IConfigurarRifa | null = null;

  // Productos
  productos: IProductoDTO[] = [];
  productoSeleccionado: IProductoDTO | null = null;
  configForm!: FormGroup;

  // Concursantes
  concursantes: IConcursante[] = [];
  concursanteForm!: FormGroup;
  forzarRegistro = false;

  // Sorteos
  totalSorteos: number = 1;
  sorteosRealizados: number = 0;
  eliminados: IConcursante[] = [];

  // Rifas activas (para retomar)
  rifasActivas: IConfigurarRifa[] = [];

  // Ruleta
  chart!: Chart;
  sorteando = false;
  ganador: IGanadorRifa | null = null;
  descartadoActual: IConcursante | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];

  private wsUnsub: (() => void) | null = null;
  private readonly DURACION_ANIMACION_MS = 4000;
  private readonly LS_CONFIG_ID = 'rifa_config_id';
  private readonly LS_TOTAL_SORTEOS = 'rifa_total_sorteos';

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
      nombre: ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      palabraRifa: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    });

    this.cargarProductos();
    this.intentarRestaurarRifa();
  }

  ngOnDestroy(): void {
    this.wsUnsub?.();
    this.chart?.destroy();
  }

  // ── Getters de estado ─────────────────────────────────────────────

  get esSorteoFinal(): boolean {
    return this.sorteosRealizados === this.totalSorteos - 1;
  }

  get sorteoLabel(): string {
    if (this.totalSorteos === 1) return 'Sortear ganador';
    const ronda = Math.min(this.sorteosRealizados + 1, this.totalSorteos);
    return this.esSorteoFinal
      ? `Ronda ${ronda}/${this.totalSorteos} — Ganador`
      : `Ronda ${ronda}/${this.totalSorteos} — Eliminar`;
  }

  get totalSorteosMax(): number {
    return Math.max(1, this.concursantes.length);
  }

  // ── Paso 1: Configurar rifa ────────────────────────────────────────

  cargarProductos(): void {
    this.productoService.getData(1, 10).subscribe({
      next: (res) => { this.productos = res.t ?? []; },
      error: (e) => console.error(e),
    });
  }

  seleccionarProducto(producto: IProductoDTO): void {
    this.productoSeleccionado = producto;
  }

  guardarConfiguracion(): void {
    if (!this.productoSeleccionado || this.configForm.invalid) return;

    const payload: IConfigurarRifa = {
      producto: { id: this.productoSeleccionado.idProducto },
      fechaHoraLimite: this.configForm.value.fechaHoraLimite,
      activa: true,
    };

    this.rifaService.configurarRifa(payload).subscribe({
      next: (res) => {
        this.rifaConfig = {
          ...res.data,
          producto: { id: this.productoSeleccionado!.idProducto, nombre: this.productoSeleccionado!.nombre },
        };
        localStorage.setItem(this.LS_CONFIG_ID, String(this.rifaConfig.id));
        localStorage.setItem(this.LS_TOTAL_SORTEOS, String(this.totalSorteos));
        this.paso = 'concursantes';
        this.suscribirWebSocket();
      },
      error: (e) => console.error(e),
    });
  }

  // ── Paso 2: Gestión de concursantes ───────────────────────────────

  agregarConcursante(): void {
    if (this.concursanteForm.invalid || !this.rifaConfig?.id) return;

    const data: IConcursante = {
      ...this.concursanteForm.value,
      configurarRifa: { id: this.rifaConfig.id },
    };

    this.rifaService.registrarConcursante(data, this.forzarRegistro).subscribe({
      next: (res) => {
        this.concursantes.push(res.data);
        this.concursanteForm.setValue({ nombre: '', apellidoPaterno: '', palabraRifa: '', telefono: '' });
        this.concursanteForm.markAsUntouched();
        this.concursanteForm.markAsPristine();
        this.forzarRegistro = false;
        this.actualizarRuleta();
      },
      error: (e) => console.error(e),
    });
  }

  eliminarConcursante(concursante: IConcursante): void {
    if (!concursante.id) return;
    this.rifaService.eliminarConcursante(concursante.id).subscribe({
      next: () => {
        this.concursantes = this.concursantes.filter(c => c.id !== concursante.id);
        this.actualizarRuleta();
      },
      error: (e) => console.error(e),
    });
  }

  // ── Ruleta ────────────────────────────────────────────────────────

  actualizarRuleta(): void {
    if (!this.ruletaCanvas) return;
    const canvas = this.ruletaCanvas.nativeElement;
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
    setTimeout(() => this.generarRuleta(), 50);
  }

  generarRuleta(): void {
    if (this.chart) this.chart.destroy();
    if (!this.concursantes.length) return;

    const colores = this.concursantes.map(() => this.colorAleatorio());

    this.chart = new Chart(this.ruletaCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.concursantes.map(c => `${c.nombre} ${c.apellidoPaterno}`),
        datasets: [{
          data: Array(this.concursantes.length).fill(1),
          backgroundColor: colores,
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

  // ── Sorteos ───────────────────────────────────────────────────────

  sortear(): void {
    if (!this.rifaConfig?.id || this.sorteando || !!this.ganador) return;
    if (this.concursantes.length < 1) return;

    this.sorteando = true;
    this.descartadoActual = null;
    const vueltaActual = this.sorteosRealizados + 1;
    let elegibles: IConcursante[] = [];

    this.rifaService.getElegibles(this.rifaConfig.id).pipe(
      switchMap(res => {
        // Guardamos elegibles pero NO tocamos el chart aún (evita que desaparezca)
        elegibles = (res.data ?? []).length > 0 ? res.data : this.concursantes;
        return this.rifaService.sortear(this.rifaConfig!.id!, vueltaActual, this.totalSorteos);
      })
    ).subscribe({
      next: (res) => {
        const resultado = res.data;

        // Ahora sí actualizamos el chart con los elegibles (justo antes de animar)
        if (elegibles.length > 0) {
          this.concursantes = elegibles;
          this.generarRuleta();
        }

        const idx = this.concursantes.findIndex(c => c.id === resultado.concursante.id);
        const targetIdx = idx >= 0 ? idx : 0;

        // Pequeña pausa para que el chart renderice antes de girar
        setTimeout(() => {
          this.girarAnimacionHacia(targetIdx, () => {
            this.sorteosRealizados++;
            this.sorteando = false;

            if (resultado.descartado) {
              // Mostrar quién fue descartado y esperar antes de regenerar ruleta
              this.descartadoActual = resultado.concursante;
              this.eliminados.push(resultado.concursante);
              setTimeout(() => {
                this.descartadoActual = null;
                this.concursantes = this.concursantes.filter(c => c.id !== resultado.concursante.id);
                this.actualizarRuleta();
              }, 2500);
            } else {
              this.ganador = resultado;
              this.lanzarConfetti();
              this.limpiarStorageRifa();
            }
          });
        }, 100);
      },
      error: (e) => {
        console.error(e);
        this.sorteando = false;
      },
    });
  }

  // ── Persistencia / recuperación ──────────────────────────────────

  private intentarRestaurarRifa(): void {
    const id = localStorage.getItem(this.LS_CONFIG_ID);

    if (id) {
      this.rifaService.getEstado(+id).subscribe({
        next: (res) => {
          const estado = res.data;
          if (estado.ganador) {
            this.limpiarStorageRifa();
            this.cargarRifasActivas();
            return;
          }
          this.aplicarEstado(estado);
          this.totalSorteos = +(localStorage.getItem(this.LS_TOTAL_SORTEOS) ?? estado.totalConcursantes ?? 1);
        },
        error: () => {
          this.limpiarStorageRifa();
          this.cargarRifasActivas();
        },
      });
    } else {
      this.cargarRifasActivas();
    }
  }

  private cargarRifasActivas(): void {
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: (res) => { this.rifasActivas = res.data ?? []; },
      error: () => { this.rifasActivas = []; },
    });
  }

  retomarRifa(config: IConfigurarRifa): void {
    this.rifaService.getEstado(config.id!).subscribe({
      next: (res) => {
        const estado = res.data;
        this.aplicarEstado(estado);
        this.totalSorteos = estado.totalConcursantes ?? 1;
        localStorage.setItem(this.LS_CONFIG_ID, String(config.id));
        localStorage.setItem(this.LS_TOTAL_SORTEOS, String(this.totalSorteos));
      },
      error: (e) => console.error(e),
    });
  }

  private aplicarEstado(estado: any): void {
    this.rifaConfig = estado.configurarRifa;
    this.concursantes = estado.elegibles ?? [];
    this.eliminados = estado.descartados ?? [];
    this.sorteosRealizados = Math.max(0, (estado.vueltaActual ?? 1) - 1);
    this.ganador = estado.ganador ?? null;
    this.paso = 'concursantes';
    this.suscribirWebSocket();
    setTimeout(() => this.generarRuleta(), 150);
  }

  private limpiarStorageRifa(): void {
    localStorage.removeItem(this.LS_CONFIG_ID);
    localStorage.removeItem(this.LS_TOTAL_SORTEOS);
  }

  nuevaRifa(): void {
    this.rifaConfig = null;
    this.productoSeleccionado = null;
    this.concursantes = [];
    this.eliminados = [];
    this.sorteosRealizados = 0;
    this.totalSorteos = 1;
    this.ganador = null;
    this.descartadoActual = null;
    this.confettiPieces = [];
    this.chart?.destroy();
    this.wsUnsub?.();
    this.wsUnsub = null;
    this.limpiarStorageRifa();
    this.configForm.reset();
    this.paso = 'configurar';
  }

  reiniciarRifa(completo = false): void {
    if (!this.rifaConfig?.id) return;

    this.rifaService.reiniciar(this.rifaConfig.id, completo).subscribe({
      next: () => {
        this.sorteosRealizados = 0;
        this.ganador = null;
        this.descartadoActual = null;
        this.confettiPieces = [];
        this.eliminados = [];

        if (completo) {
          // Borra concursantes también — la ruleta queda vacía
          this.concursantes = [];
          this.chart?.destroy();
        } else {
          // Mantiene concursantes: recarga elegibles del back
          this.rifaService.getElegibles(this.rifaConfig!.id!).subscribe({
            next: (res) => {
              this.concursantes = res.data ?? [];
              this.actualizarRuleta();
            },
            error: (e) => console.error(e),
          });
        }
      },
      error: (e) => console.error(e),
    });
  }

  private girarAnimacionHacia(index: number, onComplete: () => void): void {
    const canvas = this.ruletaCanvas?.nativeElement;
    if (!canvas) return;

    const segmentAngle = 360 / this.concursantes.length;
    const centerOfTarget = index * segmentAngle + segmentAngle / 2;
    // Rotación necesaria para que el indicador (top) quede sobre el segmento ganador
    const rotationToTarget = 360 - centerOfTarget;
    const finalRotation = 10 * 360 + rotationToTarget;

    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';

    setTimeout(() => {
      canvas.style.transition = `transform ${this.DURACION_ANIMACION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)`;
      canvas.style.transform = `rotate(${finalRotation}deg)`;
      setTimeout(onComplete, this.DURACION_ANIMACION_MS + 100);
    }, 50);
  }

  private suscribirWebSocket(): void {
    this.wsUnsub = this.webSocketService.suscribirRuleta((mensaje) => {
      this.ganador = mensaje?.data ?? mensaje;
      this.sorteando = false;
    });
  }

  private lanzarConfetti(): void {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595'];
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
    const letters = '0123456789ABCDEF';
    return '#' + Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 16)]).join('');
  }
}
