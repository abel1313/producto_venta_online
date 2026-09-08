import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { WebSocketServiceService } from 'src/app/socket/web-socket-service.service';
import { IConfigurarRifa, IConfigurarRifaVariante, TipoRifa } from '../models/configurar-rifa.model';
import { IConcursante, IClientePedido, IOmitidoYaRegistrado } from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa, IHistorialVariante } from '../models/estado-rifa.model';
import { RifaService, ModoContinuacion } from '../service/rifa.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';

Chart.register(ArcElement, PieController, ChartDataLabels);

type Paso = 'configurar' | 'ruleta' | 'transicion' | 'resumen';

@Component({
  selector: 'app-agregar-rifa',
  templateUrl: './agregar-rifa.component.html',
  styleUrls: ['./agregar-rifa.component.scss']
})
export class AgregarRifaComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('searchWrapVariante') searchWrapVariante?: ElementRef<HTMLElement>;
  @ViewChild('searchWrapCliente') searchWrapCliente?: ElementRef<HTMLElement>;

  paso: Paso = 'configurar';

  // ── Sección A ──────────────────────────────────────────────────────
  configForm!: FormGroup;
  rifaConfig: IConfigurarRifa | null = null;
  savingConfig = false;
  editandoConfig = false;
  cambiandoModoPrueba = false;

  // ── Lightbox de imagen ────────────────────────────────────────────
  imagenModal: string | null = null;
  // ── Modal detalle de variante (ruleta) ────────────────────────────
  varianteModal: IConfigurarRifaVariante | null = null;

  // ── Multi-rifa wizard ───────────────────────────────────────────────
  rifasAnteriores: Array<{
    rifa: IConfigurarRifa;
    totalVariantes: number;
    totalConcursantes: number;
  }> = [];
  mostrarCopiarAnterior = false;
  palabraClaveCopia = '';
  rifaOrigenId: number | null = null;
  copiandoDeRifa = false;

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
  omitidosImport: IOmitidoYaRegistrado[] = [];
  omitidosSinNombre: IClientePedido[] = [];

  // elegibles al presionar "ver elegibles"
  elegiblesVista: IConcursante[] = [];

  // edición / errores de concursante
  errorConcursante: string | null = null;
  editandoConcursanteId: number | null = null;
  editConcursanteForm!: FormGroup;

  // ── Rifa diaria — búsqueda de cliente registrado ────────────────────
  terminoBuscaCliente = '';
  clientesBusqueda: IClienteBusquedaDto[] = [];
  buscandoCliente = false;
  private busqClienteSubject = new Subject<string>();
  private busqClienteSub?: Subscription;

  // ── Modo wizard: false = editando config, true = en sorteo ────────────
  modoSorteo = false;

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
  // Se activa al retomar cuando estamos en variante 2+ con elegibles vacíos
  mostrarSeleccionModo = false;
  participanteNuevoForm!: FormGroup;
  guardandoNuevo = false;

  // ── Modal participante en ruleta (permitirNuevos) ──────────────────
  mostrarModalParticipante = false;
  participanteRuletaForm!: FormGroup;
  guardandoParticipanteRuleta = false;

  // ── Fecha/hora límite — dos campos separados ──────────────────────
  fechaLimFecha = '';
  fechaLimHora  = '23:59';
  readonly horasDisponibles: { value: string; label: string }[] = (() => {
    const opts: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        let label = v;
        if (v === '00:00') label = '00:00 — Media noche';
        else if (v === '12:00') label = '12:00 — Mediodía';
        opts.push({ value: v, label });
      }
    }
    opts.push({ value: '23:59', label: '23:59 — Fin del día' });
    return opts;
  })();

  private chart!: Chart;
  private wsUnsub: (() => void) | null = null;
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly rifaService: RifaService,
    private readonly webSocketService: WebSocketServiceService,
    private readonly clienteService: ClienteService,
    private readonly fb: FormBuilder,
    readonly router: Router
  ) {}

  ngOnInit(): void {
    this.configForm = this.fb.group({
      tipo:            ['DIARIA' as TipoRifa, Validators.required],
      mesReferencia:   [''],
      esPrueba:        [true],
    });

    this.concursanteForm = this.fb.group({
      nombre:          ['', Validators.required],
      apellidoPaterno: ['', Validators.required],
      telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      palabraClave:    ['', Validators.required],
    });

    this.editConcursanteForm = this.fb.group({
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

    this.busqClienteSub = this.busqClienteSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(t => {
        if (t.length < 3) { this.clientesBusqueda = []; return EMPTY; }
        this.buscandoCliente = true;
        return this.clienteService.buscarClientes(t, 0, 10).pipe(
          catchError(() => { this.buscandoCliente = false; return EMPTY; })
        );
      })
    ).subscribe({
      next: res => { this.clientesBusqueda = res?.data?.list ?? []; this.buscandoCliente = false; }
    });

    // Auto-retomar si viene desde buscar-rifa
    const retomarId = history.state?.retomarRifaId as number | undefined;
    if (retomarId) {
      this._retomar(retomarId);
    }

    // Cargar todas las rifas DIARIA de hoy → mostrar como wizard anteriores
    const hoy = new Date().toISOString().slice(0, 10);
    this.rifaService.buscarConfiguraciones({ tipo: 'DIARIA', desde: hoy, hasta: hoy }).subscribe({
      next: rifas => {
        for (const r of rifas) {
          if (r.id === retomarId) continue; // la activa ya está en rifaConfig
          if (this.rifasAnteriores.some(a => a.rifa.id === r.id)) continue; // ya en memoria
          this.rifasAnteriores.push({
            rifa: r,
            totalVariantes: r.totalVariantes ?? 0,
            totalConcursantes: 0
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.hoverTimer);
    this.busqSub?.unsubscribe();
    this.busqClienteSub?.unsubscribe();
    this.wsUnsub?.();
    this.chart?.destroy();
  }

  // ── Sección A ──────────────────────────────────────────────────────

  guardarConfiguracion(): void {
    if (this.configForm.invalid || !this.fechaLimFecha || !this.fechaLimHora) return;
    this.savingConfig = true;
    this.errorConcursante = null;
    const tipo: TipoRifa = this.configForm.value.tipo;
    this.rifaService.configurarRifa({
      fechaHoraLimite: `${this.fechaLimFecha}T${this.fechaLimHora}`,
      activa: true,
      tipo,
      mesReferencia: tipo === 'MENSUAL' ? (this.configForm.value.mesReferencia || null) : null,
      esPrueba: !!this.configForm.value.esPrueba
    }).subscribe({
      next: res => {
        this.rifaConfig = res;
        this.savingConfig = false;
        this.cargarVariantesRifa();
        this.cargarConcursantes();
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar la configuración de la rifa.';
        this.savingConfig = false;
      }
    });
  }

  actualizarConfiguracion(): void {
    if (!this.rifaConfig?.id || !this.fechaLimFecha || !this.fechaLimHora) return;
    this.savingConfig = true;
    this.errorConcursante = null;
    this.rifaService.actualizarConfiguracion(this.rifaConfig.id, {
      fechaHoraLimite: `${this.fechaLimFecha}T${this.fechaLimHora}`,
    }).subscribe({
      next: res => {
        this.rifaConfig = res;
        this.savingConfig = false;
        this.editandoConfig = false;
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo actualizar la configuración.';
        this.savingConfig = false;
      }
    });
  }

  // ── Modo prueba ────────────────────────────────────────────────────

  toggleModoPrueba(): void {
    if (!this.rifaConfig?.id || this.cambiandoModoPrueba) return;
    const nuevoValor = !this.rifaConfig.esPrueba;

    const ejecutar = () => {
      this.cambiandoModoPrueba = true;
      this.errorConcursante = null;
      this.rifaService.setEsPrueba(this.rifaConfig!.id!, nuevoValor).subscribe({
        next: res => {
          this.rifaConfig = res;
          this.cambiandoModoPrueba = false;
          this.cargarConcursantes();
        },
        error: err => {
          this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cambiar el modo de prueba.';
          this.cambiandoModoPrueba = false;
        }
      });
    };

    if (!nuevoValor) {
      Swal.fire({
        icon: 'warning',
        title: '¿Pasar a sorteo real?',
        html: 'Se restablecerán los descartes y se borrarán los giros de prueba.<br>El sorteo comenzará desde cero con los mismos participantes.',
        showCancelButton: true,
        confirmButtonText: 'Sí, pasar a real',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
      }).then(result => { if (result.isConfirmed) ejecutar(); });
      return;
    }

    ejecutar();
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

  // Los dropdowns se posicionan como `fixed` (vía getBoundingClientRect) para no
  // quedar recortados por el `overflow: hidden` de `.rf-card`.
  get dropdownStyleVariante(): { [key: string]: string | number } {
    return this.dropdownStyleFor(this.searchWrapVariante);
  }

  get dropdownStyleCliente(): { [key: string]: string | number } {
    return this.dropdownStyleFor(this.searchWrapCliente);
  }

  private dropdownStyleFor(ref?: ElementRef<HTMLElement>): { [key: string]: string | number } {
    const el = ref?.nativeElement;
    if (!el) return {};
    const r = el.getBoundingClientRect();
    return {
      position: 'fixed',
      'top.px': r.bottom + 4,
      'left.px': r.left,
      'width.px': r.width
    };
  }

  guardarVarianteRifa(): void {
    if (!this.varianteParaAgregar || !this.rifaConfig?.id || !this.palabraClaveInput.trim() || this.giroGanadorInput < 1 || this.guardandoVariante) return;
    this.guardandoVariante = true;
    this.errorConcursante = null;

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
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo agregar el premio.';
        this.guardandoVariante = false;
      }
    });
  }

  eliminarVarianteRifa(v: IConfigurarRifaVariante): void {
    if (!v.id) return;
    this.errorConcursante = null;
    this.rifaService.eliminarVarianteRifa(v.id).subscribe({
      next: () => {
        this.variantesRifa = this.variantesRifa.filter(x => x.id !== v.id);
        this.variantesRifa.forEach((x, i) => x.orden = i + 1);
        this.palabrasClave = this.variantesRifa.map(x => x.palabraClave);
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo eliminar el premio.';
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
    this.errorConcursante = null;

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
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo agregar el participante.';
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

  // ── Edición de participante ─────────────────────────────────────────

  iniciarEdicion(c: IConcursante): void {
    this.errorConcursante = null;
    this.editandoConcursanteId = c.id ?? null;
    this.editConcursanteForm.setValue({
      nombre:          c.nombre,
      apellidoPaterno: c.apellidoPaterno,
      telefono:        c.telefono,
      palabraClave:    c.palabraClave ?? ''
    });
  }

  cancelarEdicion(): void {
    this.editandoConcursanteId = null;
  }

  guardarEdicionConcursante(c: IConcursante): void {
    if (!c.id || this.editConcursanteForm.invalid) return;
    this.errorConcursante = null;
    const cambios = {
      ...this.editConcursanteForm.value,
      palabraClave: (this.editConcursanteForm.value.palabraClave as string).toUpperCase()
    };
    this.rifaService.actualizarConcursante(c.id, cambios).subscribe({
      next: res => {
        const idx = this.concursantes.findIndex(x => x.id === c.id);
        if (idx >= 0) this.concursantes[idx] = { ...this.concursantes[idx], ...res };
        this.editandoConcursanteId = null;
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo actualizar el participante.';
      }
    });
  }

  verElegibles(): void {
    if (!this.rifaConfig?.id) return;
    this.errorConcursante = null;
    this.rifaService.getElegibles(this.rifaConfig.id).subscribe({
      next: res => { this.elegiblesVista = res; },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudieron cargar los elegibles.';
      }
    });
  }

  // ── Rifa diaria — búsqueda de cliente registrado ────────────────────

  onBuscarCliente(event: Event): void {
    const t = (event.target as HTMLInputElement).value;
    this.terminoBuscaCliente = t;
    if (t.length < 3) this.clientesBusqueda = [];
    this.busqClienteSubject.next(t);
  }

  seleccionarCliente(c: IClienteBusquedaDto): void {
    this.concursanteForm.patchValue({
      nombre:          c.nombrePersona,
      apellidoPaterno: c.apeidoPaterno,
      telefono:        c.numeroTelefonico
    });
    this.terminoBuscaCliente = `${c.nombrePersona} ${c.apeidoPaterno}`.trim();
    this.clientesBusqueda = [];
  }

  // ── Importar desde pedidos ──────────────────────────────────────────

  cargarClientesMes(): void {
    if (!this.mesSeleccionado) return;
    this.cargandoClientes = true;
    this.errorConcursante = null;
    this.clientesMes = [];
    this.clientesSeleccionados.clear();
    this.rifaService.getClientesPorMes(this.mesSeleccionado).subscribe({
      next: res => { this.clientesMes = res; this.cargandoClientes = false; },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudieron cargar los clientes del mes.';
        this.cargandoClientes = false;
      }
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
    this.errorConcursante = null;

    const clientes = [...this.clientesSeleccionados].map(i => this.clientesMes[i]);

    this.rifaService.importarDePedidos({
      configurarRifaId: this.rifaConfig.id,
      palabraClave:     this.palabraClaveImport.trim().toUpperCase(),
      ordenDesde:       1,
      mes:              this.mesSeleccionado,
      clientes
    }).subscribe({
      next: res => {
        this.concursantes.push(...res.importados);
        this.omitidosImport = res.omitidosYaRegistrados ?? [];
        this.omitidosSinNombre = res.omitidosSinNombre ?? [];
        this.importando = false;
        this.mostrarImportar = false;
        this.clientesMes = [];
        this.clientesSeleccionados.clear();
        this.palabraClaveImport = '';
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudieron importar los participantes.';
        this.importando = false;
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

  // ── Navegación ─────────────────────────────────────────────────────

  irARuleta(): void {
    if (!this.rifaConfig?.id) return;
    this.modoSorteo = true;
    this.rifaService.getEstado(this.rifaConfig.id).subscribe({
      next: res => {
        this.aplicarEstado(res);
        this.paso = 'ruleta';
        this.suscribirWebSocket();
        setTimeout(() => this.generarRuleta(), 200);
      }
    });
  }

  // Carga estado → variantes → elegibles (si vacíos) y luego muestra la pantalla correcta
  private _retomar(rifaId: number): void {
    this.rifaService.getEstado(rifaId).subscribe({
      next: res => {
        this.rifaConfig = res.configurarRifa;
        // Rellenar el form con los valores guardados para que Sección A
        // no aparezca vacía al retomar (configForm nunca se patchea solo).
        const fl = (res.configurarRifa.fechaHoraLimite ?? '').replace(' ', 'T').slice(0, 16);
        this.fechaLimFecha = fl.split('T')[0] ?? '';
        this.fechaLimHora  = fl.split('T')[1]?.substring(0, 5) ?? '';
        this.configForm.patchValue({
          tipo:          res.configurarRifa.tipo          ?? 'DIARIA',
          mesReferencia: res.configurarRifa.mesReferencia ?? '',
          esPrueba:      !!res.configurarRifa.esPrueba,
        });
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

            // Rifa incompleta: sin variantes (premios) o sin concursantes → volver a
            // configurar para que el admin pueda completar Secciones B y C antes del sorteo.
            if (variantes.length === 0 || res.totalConcursantes === 0 || !this.modoSorteo) {
              // Sin premios/participantes → config obligatorio.
              // Si modoSorteo=false (retomar antes de ir al sorteo) → siempre config.
              this.paso = 'configurar';
              return;
            }

            this.paso = 'ruleta';
            this.suscribirWebSocket();

            if (this.elegibles.length > 0) {
              setTimeout(() => this.generarRuleta(), 200);
            } else if ((res.varianteNumeroActual ?? 1) > 1) {
              // Estamos en variante 2+ sin elegibles: el admin debe elegir modo de continuación
              this.mostrarSeleccionModo = true;
            } else {
              // Primer variante sin elegibles aún: pedir al backend
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
    this.modoSorteo           = false;
    this.rifaConfig           = null;
    this.variantesRifa        = [];
    this.concursantes         = [];
    this.elegibles            = [];
    this.descartados          = [];
    this.estado               = null;
    this.ganadorActual        = null;
    this.descartadoActual     = null;
    this.confettiPieces       = [];
    this.palabrasClave        = [];
    this.modoElegido          = null;
    this.mostrarSeleccionModo = false;
    this.mostrarFormNuevo     = false;
    this.omitidosImport       = [];
    this.omitidosSinNombre    = [];
    this.errorConcursante     = null;
    this.editandoConcursanteId = null;
    this.clientesBusqueda     = [];
    this.terminoBuscaCliente  = '';
    this.cambiandoModoPrueba  = false;
    this.rifasAnteriores      = [];
    this.mostrarCopiarAnterior = false;
    this.palabraClaveCopia    = '';
    this.rifaOrigenId         = null;
    this.copiandoDeRifa       = false;
    this.chart?.destroy();
    this.wsUnsub?.();
    this.wsUnsub = null;
    this.fechaLimFecha = '';
    this.fechaLimHora  = '23:59';
    this.configForm.reset({ tipo: 'DIARIA', mesReferencia: '', esPrueba: true });
    this.concursanteForm.reset();
    this.paso = 'configurar';
  }

  quitarDelWizard(idx: number): void {
    this.rifasAnteriores.splice(idx, 1);
  }

  // ── Ruleta ─────────────────────────────────────────────────────────

  sortear(): void {
    if (!this.rifaConfig?.id || this.sorteando) return;

    const ejecutar = () => {
      this.sorteando = true;
      this.descartadoActual = null;
      this.errorConcursante = null;
      this.rifaService.sortear(this.rifaConfig!.id!).subscribe({
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
        error: err => {
          this.sorteando = false;
          this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo realizar el sorteo.';
        }
      });
    };

    if (this.rifaConfig.esPrueba) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Esta rifa es de PRUEBA',
        text: 'Los resultados no son definitivos.',
        confirmButtonText: 'Entendido — continuar',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
      }).then(result => { if (result.isConfirmed) ejecutar(); });
      return;
    }

    ejecutar();
  }

  // ── Transición ─────────────────────────────────────────────────────

  elegirModo(modo: ModoContinuacion): void {
    this.modoElegido = modo;
    if (modo !== 'NUEVOS') {
      this.confirmarContinuar();
    }
    // Si es NUEVOS, se muestra el formulario inline para agregar participantes
  }

  verResumenFinal(): void {
    if (!this.rifaConfig?.id) return;
    this.errorConcursante = null;
    this.rifaService.getEstado(this.rifaConfig.id).subscribe({
      next: res => {
        this.aplicarEstado(res);
        this.ganadorActual = null;
        this.paso = 'resumen';
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar el resumen.';
      }
    });
  }

  confirmarContinuar(): void {
    if (!this.rifaConfig?.id || !this.modoElegido) return;
    const rifaId = this.rifaConfig.id;
    this.errorConcursante = null;
    this.rifaService.continuarVariante(rifaId, this.modoElegido).subscribe({
      next: res => {
        this.aplicarEstado(res);
        this.ganadorActual        = null;
        this.modoElegido          = null;
        this.mostrarFormNuevo     = false;
        this.mostrarSeleccionModo = false;
        this.descartados          = [];

        if (res.rifaTerminada) {
          this.paso = 'resumen';
        } else {
          // Recargar variantes para tener los chips actualizados
          this.rifaService.getVariantesRifa(rifaId).subscribe({
            next: variantes => {
              this.variantesRifa = variantes.sort((a, b) => a.orden - b.orden);
              this.palabrasClave  = variantes.map(v => v.palabraClave);
            }
          });
          this.paso = 'ruleta';
          setTimeout(() => this.generarRuleta(), 200);
        }
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo continuar con la siguiente variante.';
      }
    });
  }

  agregarParticipanteTransicion(): void {
    if (this.participanteNuevoForm.invalid || !this.rifaConfig?.id || !this.estado?.varianteActual) return;
    this.guardandoNuevo = true;
    this.errorConcursante = null;

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
      error: err => {
        this.guardandoNuevo = false;
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo agregar el participante.';
      }
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
    this.errorConcursante = null;

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
      error: err => {
        this.guardandoParticipanteRuleta = false;
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo agregar el participante.';
      }
    });
  }

  // ── Reiniciar ──────────────────────────────────────────────────────

  reiniciar(completo: boolean): void {
    if (!this.rifaConfig?.id) return;
    const rifaId = this.rifaConfig.id;
    this.errorConcursante = null;
    this.rifaService.reiniciar(rifaId, completo).subscribe({
      next: () => {
        if (completo) {
          this.nuevaRifa();
        } else {
          // Conservar participantes → recargar estado completo de la rifa
          // (reiniciar el back limpió giros/descartados, _retomar los trae frescos)
          this._retomar(rifaId);
        }
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo reiniciar el sorteo.';
      }
    });
  }

  // ── Getters para la UI ─────────────────────────────────────────────

  get puedeIrARuleta(): boolean {
    return !!(this.rifaConfig?.id && this.variantesRifa.length > 0 && this.concursantes.length > 0);
  }

  get puedeReiniciar(): boolean {
    return !(this.rifaConfig?.tipo === 'DIARIA' && !this.rifaConfig?.activa);
  }

  get puedeAgregarOtraRifa(): boolean {
    return !!(this.rifaConfig?.id && this.variantesRifa.length > 0);
  }

  // Participantes activos (no descartados) para mostrar en sección C
  get concursantesActivos(): IConcursante[] {
    return this.concursantes.filter(c => !c.descartado);
  }

  get concursantesDescartados(): IConcursante[] {
    return this.concursantes.filter(c => c.descartado);
  }

  // Participantes "normales" vs agregados durante el modo prueba
  get concursantesParticipantes(): IConcursante[] {
    return this.concursantesActivos.filter(c => !c.agregadoEnPrueba);
  }

  get concursantesEnPrueba(): IConcursante[] {
    return this.concursantesActivos.filter(c => c.agregadoEnPrueba);
  }

  get esRifaDiaria(): boolean {
    return (this.rifaConfig?.tipo ?? this.configForm?.value?.tipo) === 'DIARIA';
  }

  // Etiqueta de la siguiente variante (para el selector de modo)
  get siguienteVarianteLabel(): string {
    const orden = (this.estado?.varianteNumeroActual ?? 0) + 1;
    return this.variantesRifa.find(v => v.orden === orden)?.palabraClave
      ?? `Variante ${orden}`;
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

  // ── Multi-rifa wizard ──────────────────────────────────────────────

  agregarOtraRifa(): void {
    if (!this.rifaConfig?.id) return;
    this.modoSorteo = false;
    this.rifasAnteriores.push({
      rifa: { ...this.rifaConfig },
      totalVariantes: this.variantesRifa.length,
      totalConcursantes: this.concursantes.length
    });
    this.rifaConfig           = null;
    this.variantesRifa        = [];
    this.concursantes         = [];
    this.elegibles            = [];
    this.descartados          = [];
    this.estado               = null;
    this.ganadorActual        = null;
    this.descartadoActual     = null;
    this.confettiPieces       = [];
    this.palabrasClave        = [];
    this.modoElegido          = null;
    this.mostrarSeleccionModo = false;
    this.mostrarFormNuevo     = false;
    this.omitidosImport       = [];
    this.omitidosSinNombre    = [];
    this.errorConcursante     = null;
    this.editandoConcursanteId = null;
    this.cambiandoModoPrueba  = false;
    this.mostrarCopiarAnterior = false;
    this.palabraClaveCopia    = '';
    this.rifaOrigenId         = null;
    this.copiandoDeRifa       = false;
    this.chart?.destroy();
    this.wsUnsub?.();
    this.wsUnsub = null;
    this.fechaLimFecha = '';
    this.fechaLimHora  = '23:59';
    this.configForm.reset({ tipo: 'DIARIA', mesReferencia: '', esPrueba: true });
    this.concursanteForm.reset();
    this.paso = 'configurar';
  }

  editarRifaAnterior(idx: number): void {
    const ante = this.rifasAnteriores[idx];
    if (!ante?.rifa?.id) return;
    if (this.rifaConfig?.id) {
      this.rifasAnteriores[idx] = {
        rifa: { ...this.rifaConfig },
        totalVariantes: this.variantesRifa.length,
        totalConcursantes: this.concursantes.length
      };
    } else {
      this.rifasAnteriores.splice(idx, 1);
    }
    this._retomar(ante.rifa.id);
  }

  copiarDeRifaAnterior(): void {
    if (!this.rifaConfig?.id || !this.rifaOrigenId || !this.palabraClaveCopia.trim() || this.copiandoDeRifa) return;
    this.copiandoDeRifa = true;
    this.errorConcursante = null;
    this.rifaService.copiarDeRifa({
      rifaOrigenId:  this.rifaOrigenId,
      rifaDestinoId: this.rifaConfig.id,
      palabraClave:  this.palabraClaveCopia.trim().toUpperCase()
    }).subscribe({
      next: copiados => {
        this.concursantes.push(...copiados);
        this.palabraClaveCopia = '';
        this.copiandoDeRifa = false;
      },
      error: err => {
        this.errorConcursante = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudieron copiar los participantes.';
        this.copiandoDeRifa = false;
      }
    });
  }

  imageSrcVariante(v: IConfigurarRifaVariante): string | null {
    const b64 = v.variante?.imagenBase64;
    if (!b64) return null;
    return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
  }

  nombreCompleto(c?: { nombre?: string | null; apellidoPaterno?: string | null } | null): string {
    if (!c) return '';
    return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
  }

  // ── Privados ───────────────────────────────────────────────────────

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
