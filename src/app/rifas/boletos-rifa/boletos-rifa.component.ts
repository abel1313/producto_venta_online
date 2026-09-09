import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ArcElement, Chart, PieController } from 'chart.js';
import { Subject, Subscription, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IConfigurarRifa, IConfigurarRifaVariante } from '../models/configurar-rifa.model';
import { IConcursante } from '../models/concursante.model';
import {
  IBoletoRifa,
  IBoletoRifaDto,
  IGrupoBoletos,
  IResultadoSorteoPlataformas,
  PlataformaBoleto
} from '../models/boleto-rifa.model';
import { RifaService } from '../service/rifa.service';
import { VarianteService } from 'src/app/variante/service/variante.service';
import { IVarianteImagenDto, IVarianteResumen } from 'src/app/variante/models/variante.model';

Chart.register(ArcElement, PieController, ChartDataLabels);

type PasoPlataformas = 'configurar' | 'boletos' | 'ruleta' | 'ganador';

const HORA_CIERRE_POR_DEFECTO = '20:00';

@Component({
  selector: 'app-boletos-rifa',
  templateUrl: './boletos-rifa.component.html',
  styleUrls: ['./boletos-rifa.component.scss']
})
export class BoletosRifaComponent implements OnInit, OnDestroy {

  @ViewChild('ruletaCanvas') ruletaCanvas?: ElementRef<HTMLCanvasElement>;

  paso: PasoPlataformas = 'configurar';

  // ── Configuración ──────────────────────────────────────────────────
  rifas: IConfigurarRifa[] = [];
  rifaSeleccionada: IConfigurarRifa | null = null;
  cargandoRifas = false;
  configFechaInicio = '';
  configFechaFin = '';
  configHoraCierre = HORA_CIERRE_POR_DEFECTO;
  guardandoRango = false;
  creandoRifa = false;
  cambiandoModoPrueba = false;

  // ── Premios (variantes de la rifa) ─────────────────────────────────
  variantesRifa: IConfigurarRifaVariante[] = [];
  cargandoPremios = false;
  terminoBusca = '';
  variantesBusqueda: IVarianteResumen[] = [];
  buscandoVariante = false;
  varianteParaAgregar: IVarianteResumen | null = null;
  giroGanadorInput = 1;
  guardandoVariante = false;
  /** id del premio cuyo "gana al giro" se está editando en línea (null = ninguno). */
  premioEditandoId: number | null = null;
  premioEditandoGiro = 1;
  guardandoPremioEditado = false;
  private busqSubject = new Subject<string>();
  private busqSub?: Subscription;

  // ── Modal de producto con carrusel ─────────────────────────────────
  varianteModal: IConfigurarRifaVariante | null = null;
  imagenesModal: IVarianteImagenDto[] = [];
  imagenIndex = 0;
  cargandoImagenes = false;

  // ── Participantes y boletos ────────────────────────────────────────
  concursantes: IConcursante[] = [];
  filtroNombre = '';
  cargandoConcursantes = false;
  concursanteSeleccionado: IConcursante | null = null;
  boletos: IBoletoRifa[] = [];
  cargandoBoletos = false;

  mostrarFormParticipante = false;
  /** id del participante en edición; null = el formulario está dando de alta uno nuevo. */
  participanteEditandoId: number | null = null;
  nuevoNombre = '';
  nuevoApellido = '';
  nuevoTelefono = '';
  guardandoParticipante = false;

  plataforma: PlataformaBoleto | '' = '';
  motivo = '';
  fecha = '';
  fechaMin = '';
  fechaMax = '';
  // Es `urlPerfilRedSocial`, no `urlSeguimiento`: el back exige ESTE campo al registrar
  // (sin el perfil el boleto no se puede verificar después) y el front lo mandaba con el
  // otro nombre, así que el alta fallaba siempre con "La URL del perfil es obligatoria".
  urlPerfilRedSocial = '';
  urlsCompartido: string[] = [''];
  guardando = false;
  /** id del boleto en edición; null = el formulario está registrando uno nuevo. */
  boletoEditandoId: number | null = null;
  /** Se prende al intentar guardar: es lo que pinta de rojo los campos que faltan. */
  intentoGuardarBoleto = false;

  readonly plataformas: { valor: PlataformaBoleto; etiqueta: string; icono: string }[] = [
    { valor: 'FACEBOOK',  etiqueta: 'Facebook',  icono: '📘' },
    { valor: 'INSTAGRAM', etiqueta: 'Instagram', icono: '📸' },
    { valor: 'TIKTOK',    etiqueta: 'TikTok',    icono: '🎵' },
    { valor: 'OTRO',      etiqueta: 'Otra',      icono: '🌐' }
  ];

  // ── Ruleta ─────────────────────────────────────────────────────────
  boletosEnJuego: IBoletoRifaDto[] = [];
  boletosDescartados: IBoletoRifaDto[] = [];
  gruposEnJuego: IGrupoBoletos[] = [];
  gruposDescartados: IGrupoBoletos[] = [];
  varianteActual: any = null;
  varianteNumeroActual = 0;
  totalVariantes = 0;
  giroActual = 0;
  giroGanador = 0;
  rifaTerminada = false;
  sorteando = false;
  cargandoRuleta = false;
  descartadoActual: IBoletoRifaDto | null = null;
  ganadorActual: IResultadoSorteoPlataformas | null = null;
  confettiPieces: { left: string; color: string; delay: string; duration: string; size: string }[] = [];
  detalleGrupo: IGrupoBoletos | null = null;

  private chart?: Chart;
  private ruletaSlots: IBoletoRifaDto[] = [];
  private readonly DURACION_ANIMACION_MS = 4000;

  constructor(
    private readonly rifaService: RifaService,
    private readonly varianteService: VarianteService
  ) {}

  ngOnInit(): void {
    const rifaIdEstado = history.state?.rifaId as number | undefined;
    this.cargarRifas(rifaIdEstado);

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

  // ── Carga de rifas ─────────────────────────────────────────────────

  /**
   * Se listan TODAS las rifas de plataformas, no solo las activas.
   *
   * Antes esto pegaba a `/activas`, y una rifa se marca inactiva sola cuando pasa su
   * fecha límite (o cuando se sortea el último premio en modo real): al volver a la
   * pantalla la rifa simplemente ya no aparecía en el selector y no había forma de
   * abrirla otra vez para revisarla. `/buscar?tipo=PLATAFORMAS` las trae todas y aquí
   * se marcan las cerradas con una etiqueta.
   */
  private cargarRifas(seleccionarId?: number): void {
    this.cargandoRifas = true;
    this.rifaService.buscarConfiguraciones({ tipo: 'PLATAFORMAS' }).subscribe({
      next: res => {
        this.rifas = (res ?? []).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.cargandoRifas = false;
        const idPrevio = seleccionarId ?? this.rifaSeleccionada?.id;
        const inicial = idPrevio
          ? this.rifas.find(r => r.id === idPrevio)
          : (this.rifas.length === 1 ? this.rifas[0] : null);
        if (inicial) this.seleccionarRifa(inicial);
      },
      error: err => { this.cargandoRifas = false; this.error('No se pudieron cargar las rifas', err); }
    });
  }

  onRifaChange(id: number): void {
    const rifa = this.rifas.find(r => r.id === id) ?? null;
    if (rifa) this.seleccionarRifa(rifa);
  }

  seleccionarRifa(rifa: IConfigurarRifa): void {
    this.rifaSeleccionada = rifa;
    this.concursanteSeleccionado = null;
    this.boletos = [];
    this.cancelarEdicionBoleto();
    this.cancelarFormParticipante();
    this.premioEditandoId = null;
    this.cargarFormularioDesdeRifa(rifa);
    this.calcularRangoFecha(rifa);
    this.cargarPremios();
    this.cargarConcursantes();
    // El estado del sorteo se carga desde el paso 1, no solo al abrir la ruleta: es lo
    // que permite avisar en los premios que la rifa ya se giró (ver `rifaYaEmpezo`).
    this.cargarEstadoRuleta();
  }

  /** Vuelca la rifa guardada al formulario -- es la referencia contra la que se
   *  compara para saber si hay cambios sin guardar. */
  private cargarFormularioDesdeRifa(rifa: IConfigurarRifa): void {
    this.configFechaInicio = rifa.fechaInicioBoletos ?? '';
    this.configFechaFin = rifa.fechaFinBoletos ?? '';
    this.configHoraCierre = this.horaDe(rifa.fechaHoraLimite) || HORA_CIERRE_POR_DEFECTO;
  }

  /** "2026-09-30T20:00:00" → "20:00". Se corta el string en vez de usar Date para
   *  no arrastrar la conversión a UTC (restaría 6 horas en México). */
  private horaDe(fechaHora?: string | null): string {
    if (!fechaHora) return '';
    const t = fechaHora.indexOf('T');
    return t >= 0 ? fechaHora.substring(t + 1, t + 6) : '';
  }

  // ── Creación / edición de la rifa ──────────────────────────────────

  /**
   * Suelta la rifa que está abierta para volver al formulario de alta.
   *
   * El formulario de "nueva rifa" solo se pinta cuando no hay rifa seleccionada, y en
   * cuanto existía una sola se auto-seleccionaba al entrar: sin esto no quedaba ningún
   * camino de regreso y no se podía crear una segunda rifa.
   */
  nuevaRifa(): void {
    this.rifaSeleccionada = null;
    this.concursanteSeleccionado = null;
    this.boletos = [];
    this.variantesRifa = [];
    this.concursantes = [];
    this.cancelarEdicionBoleto();
    this.cancelarFormParticipante();
    this.cancelarPremioNuevo();
    this.premioEditandoId = null;
    this.paso = 'configurar';
    this.configHoraCierre = HORA_CIERRE_POR_DEFECTO;
    this.aplicarPreset('semana');
  }

  // La rifa nace siempre como PRUEBA: se activa como real desde el botón, y solo
  // después de avisar si todavía no termina el periodo.
  crearRifa(): void {
    const problema = this.problemaConLasFechas();
    if (problema) { this.avisar('Revisa las fechas', problema); return; }
    if (this.creandoRifa) return;

    this.creandoRifa = true;
    this.rifaService.configurarRifa({
      fechaHoraLimite: this.fechaHoraLimiteArmada(),
      activa: true,
      tipo: 'PLATAFORMAS',
      esPrueba: true
    }).subscribe({
      next: creada => {
        this.rifaService.actualizarConfiguracion(creada.id!, {
          fechaInicioBoletos: this.configFechaInicio,
          fechaFinBoletos: this.configFechaFin
        }).subscribe({
          next: rifa => {
            this.creandoRifa = false;
            this.rifas = [rifa, ...this.rifas];
            this.seleccionarRifa(rifa);
            this.avisarOk('Rifa creada', 'Ya puedes agregar los premios y los participantes.');
          },
          error: err => { this.creandoRifa = false; this.error('No se pudieron guardar las fechas', err); }
        });
      },
      error: err => { this.creandoRifa = false; this.error('No se pudo crear la rifa', err); }
    });
  }

  guardarRangoBoletos(): void {
    if (!this.rifaSeleccionada?.id || this.guardandoRango) return;
    const problema = this.problemaConLasFechas();
    if (problema) { this.avisar('Revisa las fechas', problema); return; }

    this.guardandoRango = true;
    this.rifaService.actualizarConfiguracion(this.rifaSeleccionada.id, {
      fechaHoraLimite: this.fechaHoraLimiteArmada(),
      fechaInicioBoletos: this.configFechaInicio,
      fechaFinBoletos: this.configFechaFin
    }).subscribe({
      next: res => {
        this.guardandoRango = false;
        this.aplicarRifaActualizada(res);
        this.avisarOk('Fechas guardadas', this.resumenDelRango);
      },
      error: err => { this.guardandoRango = false; this.error('No se pudo guardar el rango', err); }
    });
  }

  /** El backend guarda la hora de cierre dentro de fechaHoraLimite (fechaFinBoletos es
   *  solo la fecha). Antes esto iba fijo a las 23:59 y no había forma de cerrar la rifa
   *  a otra hora. */
  private fechaHoraLimiteArmada(): string {
    return `${this.configFechaFin}T${this.configHoraCierre || HORA_CIERRE_POR_DEFECTO}`;
  }

  private aplicarRifaActualizada(res: IConfigurarRifa): void {
    this.rifaSeleccionada = res;
    const idx = this.rifas.findIndex(r => r.id === res.id);
    if (idx >= 0) this.rifas[idx] = res;
    this.cargarFormularioDesdeRifa(res);
    this.calcularRangoFecha(res);
  }

  // ── Validación de fechas (lo que bloquea y explica por qué) ────────

  /** Devuelve el motivo por el que las fechas no sirven, o null si están bien. */
  problemaConLasFechas(): string | null {
    if (!this.configFechaInicio || !this.configFechaFin) {
      return 'Falta indicar desde y hasta cuándo se pueden juntar boletos.';
    }
    if (this.configFechaInicio > this.configFechaFin) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    if (!this.configHoraCierre) {
      return 'Falta la hora a la que cierra la rifa el último día.';
    }
    return null;
  }

  get rangoConfigurado(): boolean {
    return !!this.rifaSeleccionada?.fechaInicioBoletos && !!this.rifaSeleccionada?.fechaFinBoletos;
  }

  /**
   * Compara el formulario contra lo que está realmente guardado en la rifa.
   *
   * Es la respuesta al caso "creí que había guardado la fecha, me dejó seguir y luego
   * nada cuadraba": ahora el paso 2 no se abre con cambios pendientes y el botón de
   * guardar queda marcado mientras haya diferencia.
   */
  get hayCambiosSinGuardar(): boolean {
    const r = this.rifaSeleccionada;
    if (!r) return false;
    return this.configFechaInicio !== (r.fechaInicioBoletos ?? '')
        || this.configFechaFin !== (r.fechaFinBoletos ?? '')
        || this.configHoraCierre !== (this.horaDe(r.fechaHoraLimite) || HORA_CIERRE_POR_DEFECTO);
  }

  get diasDelRango(): number {
    if (!this.configFechaInicio || !this.configFechaFin) return 0;
    const a = this.aDate(this.configFechaInicio);
    const b = this.aDate(this.configFechaFin);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  }

  get resumenDelRango(): string {
    if (this.problemaConLasFechas()) return '';
    const dias = this.diasDelRango;
    return `Del ${this.enPalabras(this.configFechaInicio)} al ${this.enPalabras(this.configFechaFin)}`
         + ` · cierra a las ${this.configHoraCierre} · ${dias} día${dias === 1 ? '' : 's'}`;
  }

  /** Atajos para no tener que abrir el calendario dos veces en el caso más común. */
  aplicarPreset(preset: 'mes' | 'quincena' | 'semana'): void {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    let fin: Date;
    if (preset === 'mes') {
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else {
      fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + (preset === 'quincena' ? 14 : 6));
    }
    this.configFechaInicio = this.aIso(inicio);
    this.configFechaFin = this.aIso(fin);
  }

  private enPalabras(iso: string): string {
    const d = this.aDate(iso);
    if (!d) return iso;
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]}`;
  }

  // ⚠️ Nunca `new Date(iso)` con el string completo: se parsea como UTC y en México
  // devuelve el día anterior.
  private aDate(iso: string): Date | null {
    const p = iso?.split('-').map(Number);
    if (!p || p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  private aIso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ── Modo prueba / real ─────────────────────────────────────────────

  get periodoTerminado(): boolean {
    const fin = this.rifaSeleccionada?.fechaFinBoletos;
    return !!fin && this.aIso(new Date()) > fin;
  }

  toggleModoPrueba(): void {
    const rifa = this.rifaSeleccionada;
    if (!rifa?.id || this.cambiandoModoPrueba) return;
    const pasarAReal = !!rifa.esPrueba;

    if (pasarAReal && !this.periodoTerminado) {
      Swal.fire({
        icon: 'warning',
        title: 'Aún no es la fecha de la rifa',
        text: `El periodo para juntar boletos termina el ${rifa.fechaFinBoletos ?? '—'}. ¿Deseas activarla como rifa real de todas formas?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar'
      }).then(r => { if (r.isConfirmed) this.aplicarModoPrueba(false); });
      return;
    }
    this.aplicarModoPrueba(!pasarAReal);
  }

  private aplicarModoPrueba(esPrueba: boolean): void {
    const rifa = this.rifaSeleccionada;
    if (!rifa?.id) return;
    this.cambiandoModoPrueba = true;
    this.rifaService.setEsPrueba(rifa.id, esPrueba).subscribe({
      next: res => {
        this.cambiandoModoPrueba = false;
        this.aplicarRifaActualizada(res);
        this.ganadorActual = null;
        if (this.paso === 'ruleta' || this.paso === 'ganador') this.cargarEstadoRuleta();
      },
      error: err => { this.cambiandoModoPrueba = false; this.error('No se pudo cambiar el modo', err); }
    });
  }

  // ── Premios ────────────────────────────────────────────────────────

  private cargarPremios(): void {
    if (!this.rifaSeleccionada?.id) return;
    this.cargandoPremios = true;
    this.rifaService.getVariantesRifa(this.rifaSeleccionada.id).subscribe({
      next: res => { this.variantesRifa = res ?? []; this.cargandoPremios = false; },
      error: err => { this.cargandoPremios = false; this.error('No se pudieron cargar los premios', err); }
    });
  }

  buscarVariante(): void { this.busqSubject.next(this.terminoBusca.trim()); }

  elegirVarianteBusqueda(v: IVarianteResumen): void {
    this.varianteParaAgregar = v;
    this.variantesBusqueda = [];
    this.terminoBusca = `${v.nombreProducto ?? ''} ${v.color ?? ''} ${v.talla ?? ''}`.trim();
  }

  cancelarPremioNuevo(): void {
    this.varianteParaAgregar = null;
    this.terminoBusca = '';
    this.variantesBusqueda = [];
    this.giroGanadorInput = 1;
  }

  /**
   * La rifa ya se giró al menos una vez.
   *
   * Los giros que ya se registraron no se recalculan: si se agrega un premio o se le
   * cambia el giro ganador a una rifa empezada, el cambio no entra al sorteo en curso
   * (y si ya salió el ganador del último premio, la ruleta queda sin nada que girar,
   * mostrando "giro 0" y el botón muerto). Reiniciar es lo que lo vuelve a abrir.
   */
  get rifaYaEmpezo(): boolean {
    return this.rifaTerminada || this.boletosDescartados.length > 0;
  }

  /** Corre `accion`, pero si la rifa ya se giró primero avisa y la reinicia. */
  private sobreRifaEmpezada(accion: () => void): void {
    if (!this.rifaYaEmpezo) { accion(); return; }
    Swal.fire({
      icon: 'warning',
      title: 'Esta rifa ya se empezó a girar',
      text: 'Los giros que ya se hicieron no se recalculan, así que este cambio no entra al sorteo hasta reiniciar la rifa: los boletos vuelven a estar en juego y se borran los giros. Los participantes y sus boletos no se pierden.',
      showCancelButton: true,
      confirmButtonText: 'Reiniciar y guardar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed || !this.rifaSeleccionada?.id) return;
      this.rifaService.reiniciarPlataformas(this.rifaSeleccionada.id).subscribe({
        next: () => {
          this.ganadorActual = null;
          this.descartadoActual = null;
          this.cargarEstadoRuleta();
          accion();
        },
        error: err => this.error('No se pudo reiniciar la rifa', err)
      });
    });
  }

  agregarPremio(): void {
    if (!this.rifaSeleccionada?.id || !this.varianteParaAgregar?.id || this.guardandoVariante) return;
    if (!this.giroGanadorInput || this.giroGanadorInput < 1) {
      this.avisar('Falta el giro ganador', 'Indica en qué giro sale el ganador de este premio (1 o más).');
      return;
    }
    this.sobreRifaEmpezada(() => this.guardarPremioNuevo());
  }

  private guardarPremioNuevo(): void {
    if (!this.rifaSeleccionada?.id || !this.varianteParaAgregar?.id) return;
    this.guardandoVariante = true;
    this.rifaService.guardarVarianteRifa({
      configurarRifaId: this.rifaSeleccionada.id,
      varianteId: this.varianteParaAgregar.id,
      palabraClave: `PREMIO${this.variantesRifa.length + 1}`,
      giroGanador: this.giroGanadorInput,
      orden: this.variantesRifa.length + 1,
      permitirNuevos: false
    }).subscribe({
      next: () => {
        this.guardandoVariante = false;
        this.cancelarPremioNuevo();
        this.cargarPremios();
      },
      error: err => { this.guardandoVariante = false; this.error('No se pudo agregar el premio', err); }
    });
  }

  // ── Edición en línea del giro ganador de un premio ya guardado ─────
  // Antes el giro quedaba congelado al agregar el premio: para cambiarlo había que
  // eliminarlo y volverlo a crear.

  editarPremio(v: IConfigurarRifaVariante): void {
    if (!v.id) return;
    this.premioEditandoId = v.id;
    this.premioEditandoGiro = v.giroGanador;
  }

  cancelarEdicionPremio(): void {
    this.premioEditandoId = null;
  }

  guardarPremioEditado(): void {
    if (!this.premioEditandoId || this.guardandoPremioEditado) return;
    if (!this.premioEditandoGiro || this.premioEditandoGiro < 1) {
      this.avisar('Giro inválido', 'El giro ganador debe ser 1 o más.');
      return;
    }
    this.sobreRifaEmpezada(() => this.guardarCambioDeGiro());
  }

  private guardarCambioDeGiro(): void {
    if (!this.premioEditandoId) return;
    this.guardandoPremioEditado = true;
    this.rifaService.editarVarianteRifa(this.premioEditandoId, { giroGanador: this.premioEditandoGiro })
      .subscribe({
        next: actualizado => {
          this.guardandoPremioEditado = false;
          const idx = this.variantesRifa.findIndex(v => v.id === this.premioEditandoId);
          if (idx >= 0) this.variantesRifa[idx] = actualizado;
          this.premioEditandoId = null;
        },
        error: err => { this.guardandoPremioEditado = false; this.error('No se pudo guardar el cambio', err); }
      });
  }

  quitarPremio(v: IConfigurarRifaVariante): void {
    if (!v.id) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar este premio?',
      text: 'El stock reservado se devuelve al inventario.',
      showCancelButton: true, confirmButtonText: 'Quitar', cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed || !v.id) return;
      this.rifaService.eliminarVarianteRifa(v.id).subscribe({
        next: () => this.cargarPremios(),
        error: err => this.error('No se pudo quitar el premio', err)
      });
    });
  }

  abrirDetallePremio(v: IConfigurarRifaVariante): void {
    this.varianteModal = v;
    this.imagenesModal = [];
    this.imagenIndex = 0;
    const varianteId = v.variante?.id;
    if (!varianteId) return;
    this.cargandoImagenes = true;
    this.varianteService.getImagenesVariante(varianteId).subscribe({
      next: res => {
        this.imagenesModal = (res ?? []).filter(i => !!i.base64);
        this.cargandoImagenes = false;
      },
      error: () => { this.cargandoImagenes = false; }
    });
  }

  cerrarDetallePremio(): void { this.varianteModal = null; this.imagenesModal = []; }

  imagenAnterior(): void {
    if (!this.imagenesModal.length) return;
    this.imagenIndex = (this.imagenIndex - 1 + this.imagenesModal.length) % this.imagenesModal.length;
  }

  imagenSiguiente(): void {
    if (!this.imagenesModal.length) return;
    this.imagenIndex = (this.imagenIndex + 1) % this.imagenesModal.length;
  }

  // ── Participantes ──────────────────────────────────────────────────

  private cargarConcursantes(): void {
    if (!this.rifaSeleccionada?.id) return;
    this.cargandoConcursantes = true;
    this.rifaService.getConcursantesPorRifa(this.rifaSeleccionada.id).subscribe({
      next: res => { this.concursantes = res; this.cargandoConcursantes = false; },
      error: () => { this.cargandoConcursantes = false; }
    });
  }

  get concursantesFiltrados(): IConcursante[] {
    const termino = this.filtroNombre.trim().toLowerCase();
    if (!termino) return this.concursantes;
    return this.concursantes.filter(c =>
      `${c.nombre} ${c.apellidoPaterno ?? ''}`.toLowerCase().includes(termino)
    );
  }

  abrirFormParticipante(): void {
    this.participanteEditandoId = null;
    this.nuevoNombre = ''; this.nuevoApellido = ''; this.nuevoTelefono = '';
    this.mostrarFormParticipante = true;
  }

  /** Faltaba por completo: solo se podía eliminar al participante, así que corregir
   *  un nombre mal escrito significaba borrarlo y perder sus boletos. */
  editarParticipante(c: IConcursante, evento?: Event): void {
    evento?.stopPropagation();
    if (!c.id) return;
    this.participanteEditandoId = c.id;
    this.nuevoNombre = c.nombre ?? '';
    this.nuevoApellido = c.apellidoPaterno ?? '';
    this.nuevoTelefono = c.telefono ?? '';
    this.mostrarFormParticipante = true;
  }

  cancelarFormParticipante(): void {
    this.mostrarFormParticipante = false;
    this.participanteEditandoId = null;
    this.nuevoNombre = ''; this.nuevoApellido = ''; this.nuevoTelefono = '';
  }

  guardarParticipante(): void {
    if (!this.rifaSeleccionada?.id || this.guardandoParticipante) return;
    if (!this.nuevoNombre.trim()) {
      this.avisar('Falta el nombre', 'El nombre del participante es obligatorio.');
      return;
    }
    this.guardandoParticipante = true;

    if (this.participanteEditandoId) {
      const id = this.participanteEditandoId;
      this.rifaService.actualizarConcursante(id, {
        nombre: this.nuevoNombre.trim(),
        apellidoPaterno: this.nuevoApellido.trim(),
        telefono: this.nuevoTelefono.trim()
      }).subscribe({
        next: res => {
          this.guardandoParticipante = false;
          const idx = this.concursantes.findIndex(c => c.id === id);
          const actualizado = idx >= 0 ? { ...this.concursantes[idx], ...res } : res;
          if (idx >= 0) this.concursantes[idx] = actualizado;
          this.cancelarFormParticipante();
          // Se queda abierto el panel de boletos de esa persona, igual que al darla de
          // alta. Al lápiz de editar se le corta el clic de la fila (stopPropagation), así
          // que si se entraba a editar sin haber seleccionado antes al participante, al
          // guardar no quedaba nadie seleccionado y no aparecía dónde registrarle boletos.
          this.seleccionarConcursante(actualizado);
        },
        error: err => { this.guardandoParticipante = false; this.error('No se pudo guardar el participante', err); }
      });
      return;
    }

    this.rifaService.registrarConcursante({
      nombre: this.nuevoNombre.trim(),
      apellidoPaterno: this.nuevoApellido.trim(),
      telefono: this.nuevoTelefono.trim(),
      palabraClave: 'PLATAFORMAS',
      ordenDesde: 1,
      // Arranca en 0: aquí los boletos se ganan uno por uno con cada acción,
      // no se regala uno de entrada como en la rifa por compras.
      boletosBase: 0,
      boletos: 0,
      configurarRifa: { id: this.rifaSeleccionada.id }
    }).subscribe({
      next: res => {
        this.guardandoParticipante = false;
        this.concursantes = [...this.concursantes, res];
        this.cancelarFormParticipante();
        this.seleccionarConcursante(res);
      },
      error: err => { this.guardandoParticipante = false; this.error('No se pudo registrar al participante', err); }
    });
  }

  eliminarParticipante(c: IConcursante, evento?: Event): void {
    evento?.stopPropagation();
    if (!c.id) return;
    Swal.fire({
      icon: 'warning',
      title: `¿Eliminar a ${this.nombreCompleto(c)}?`,
      text: 'Se pierden también todos sus boletos de esta rifa.',
      showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed || !c.id) return;
      this.rifaService.eliminarConcursante(c.id).subscribe({
        next: () => {
          this.concursantes = this.concursantes.filter(x => x.id !== c.id);
          if (this.concursanteSeleccionado?.id === c.id) this.concursanteSeleccionado = null;
          // Si se eliminó justo al que estaba abierto en el formulario, este deja de
          // apuntar a un id que ya no existe y se queda con lo escrito, pero como alta
          // nueva: darle "Guardar" lo vuelve a registrar. Antes seguía en modo edición y
          // el back respondía "Concursante no encontrado".
          if (this.participanteEditandoId === c.id) this.participanteEditandoId = null;
        },
        error: err => this.error('No se pudo eliminar al participante', err)
      });
    });
  }

  seleccionarConcursante(c: IConcursante): void {
    this.concursanteSeleccionado = c;
    this.cancelarEdicionBoleto();
    this.cargandoBoletos = true;
    this.rifaService.getBoletosPorConcursante(c.id!).subscribe({
      next: res => { this.boletos = res; this.cargandoBoletos = false; },
      error: () => { this.cargandoBoletos = false; }
    });
  }

  private calcularRangoFecha(rifa: IConfigurarRifa): void {
    if (rifa.fechaInicioBoletos && rifa.fechaFinBoletos) {
      this.fechaMin = rifa.fechaInicioBoletos;
      this.fechaMax = rifa.fechaFinBoletos;
    } else {
      const hoy = new Date();
      this.fechaMin = this.aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.fechaMax = this.aIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    }
    const hoyStr = this.aIso(new Date());
    this.fecha = (hoyStr >= this.fechaMin && hoyStr <= this.fechaMax) ? hoyStr : this.fechaMin;
  }

  // ── Boletos ────────────────────────────────────────────────────────

  resetForm(): void {
    this.plataforma = '';
    this.motivo = '';
    this.urlPerfilRedSocial = '';
    this.urlsCompartido = [''];
    this.intentoGuardarBoleto = false;
    if (this.rifaSeleccionada) this.calcularRangoFecha(this.rifaSeleccionada);
  }

  agregarCampoUrl(): void { this.urlsCompartido.push(''); }

  quitarCampoUrl(index: number): void {
    this.urlsCompartido.splice(index, 1);
    if (this.urlsCompartido.length === 0) this.urlsCompartido = [''];
  }

  seguirPor(indice: number): number { return indice; }

  editarBoleto(b: IBoletoRifa): void {
    if (!b.id) return;
    this.boletoEditandoId = b.id;
    this.plataforma = b.plataforma ?? '';
    this.motivo = b.motivo ?? '';
    this.fecha = b.fecha;
    this.urlPerfilRedSocial = b.urlPerfilRedSocial ?? '';
    this.urlsCompartido = b.urlsCompartido?.length ? [...b.urlsCompartido] : [''];
    this.intentoGuardarBoleto = false;
  }

  cancelarEdicionBoleto(): void {
    this.boletoEditandoId = null;
    this.resetForm();
  }

  /** Motivo por el que el boleto no se puede guardar, o null si está listo. */
  problemaConElBoleto(): string | null {
    if (!this.plataforma) return 'Selecciona la plataforma en la que hizo la acción.';
    if (!this.urlPerfilRedSocial.trim()) {
      return 'Falta la URL del perfil: sin ella el boleto no se puede verificar después.';
    }
    if (!this.fecha) return 'Falta la fecha de la acción.';
    if (this.fecha < this.fechaMin || this.fecha > this.fechaMax) {
      return `La fecha debe estar entre ${this.fechaMin} y ${this.fechaMax}, que es el periodo de la rifa.`;
    }
    return null;
  }

  guardarBoleto(): void {
    if (!this.concursanteSeleccionado?.id || this.guardando) return;
    this.intentoGuardarBoleto = true;
    const problema = this.problemaConElBoleto();
    if (problema) { this.avisar('Falta información del boleto', problema); return; }

    const payload = {
      concursanteId: this.concursanteSeleccionado.id,
      plataforma: this.plataforma as PlataformaBoleto,
      motivo: this.motivo.trim() || null,
      fecha: this.fecha || null,
      urlPerfilRedSocial: this.urlPerfilRedSocial.trim(),
      urlsCompartido: this.urlsCompartido.map(u => u.trim()).filter(u => !!u)
    };

    this.guardando = true;

    if (this.boletoEditandoId) {
      const id = this.boletoEditandoId;
      this.rifaService.editarBoleto(id, payload).subscribe({
        next: actualizado => {
          this.guardando = false;
          const idx = this.boletos.findIndex(b => b.id === id);
          if (idx >= 0) this.boletos[idx] = actualizado;
          this.cancelarEdicionBoleto();
        },
        error: err => { this.guardando = false; this.error('No se pudo guardar el boleto', err); }
      });
      return;
    }

    this.rifaService.registrarBoleto(payload).subscribe({
      next: boleto => {
        this.guardando = false;
        this.boletos = [boleto, ...this.boletos];
        if (this.concursanteSeleccionado) {
          this.concursanteSeleccionado.boletos = (this.concursanteSeleccionado.boletos ?? 0) + 1;
          const idx = this.concursantes.findIndex(c => c.id === this.concursanteSeleccionado!.id);
          if (idx >= 0) this.concursantes[idx].boletos = this.concursanteSeleccionado.boletos;
        }
        this.resetForm();
      },
      error: err => { this.guardando = false; this.error('No se pudo registrar el boleto', err); }
    });
  }

  eliminarBoleto(b: IBoletoRifa): void {
    if (!b.id) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar este boleto?',
      text: 'Se descontará del total de boletos del participante.',
      showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
    }).then(res => {
      if (!res.isConfirmed || !b.id) return;
      this.rifaService.eliminarBoleto(b.id).subscribe({
        next: () => {
          this.boletos = this.boletos.filter(x => x.id !== b.id);
          if (this.boletoEditandoId === b.id) this.cancelarEdicionBoleto();
          if (this.concursanteSeleccionado) {
            this.concursanteSeleccionado.boletos = Math.max(0, (this.concursanteSeleccionado.boletos ?? 1) - 1);
            const idx = this.concursantes.findIndex(c => c.id === this.concursanteSeleccionado!.id);
            if (idx >= 0) this.concursantes[idx].boletos = this.concursanteSeleccionado.boletos;
          }
        },
        error: err => this.error('No se pudo eliminar', err)
      });
    });
  }

  iconoPlataforma(p?: string | null): string {
    return this.plataformas.find(x => x.valor === p)?.icono ?? '🎟️';
  }

  // ── Navegación entre pasos ─────────────────────────────────────────
  // Cada bloqueo dice exactamente QUÉ falta y ofrece el arreglo, en vez de solo no
  // hacer nada o -- peor -- dejar pasar y fallar más adelante.

  irAPaso(paso: PasoPlataformas): void {
    if (paso === 'boletos') {
      if (!this.rangoConfigurado) {
        Swal.fire({
          icon: 'warning',
          title: 'Primero guarda las fechas',
          text: 'Esta rifa todavía no tiene guardado el periodo en el que se aceptan boletos. Sin eso no se puede registrar ninguno.',
          confirmButtonText: 'Ir a las fechas'
        }).then(() => { this.paso = 'configurar'; });
        return;
      }
      if (this.hayCambiosSinGuardar) {
        Swal.fire({
          icon: 'warning',
          title: 'Tienes cambios sin guardar',
          text: 'Cambiaste las fechas pero no las guardaste. Si sigues, los boletos se van a validar contra las fechas anteriores.',
          showCancelButton: true,
          confirmButtonText: 'Guardar y seguir',
          cancelButtonText: 'Volver a las fechas'
        }).then(r => {
          if (r.isConfirmed) this.guardarYContinuar();
          else this.paso = 'configurar';
        });
        return;
      }
    }

    if (paso === 'ruleta') {
      if (!this.variantesRifa.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Falta el premio',
          text: 'Agrega al menos un premio antes de girar la ruleta.',
          confirmButtonText: 'Ir a los premios'
        }).then(() => { this.paso = 'configurar'; });
        return;
      }
      if (!this.concursantes.length) {
        Swal.fire({
          icon: 'warning',
          title: 'No hay participantes',
          text: 'Registra al menos un participante con boletos antes de girar.',
          confirmButtonText: 'Ir a los boletos'
        }).then(() => { this.paso = 'boletos'; });
        return;
      }
      this.cargarEstadoRuleta();
    }

    this.paso = paso;
  }

  private guardarYContinuar(): void {
    if (!this.rifaSeleccionada?.id) return;
    const problema = this.problemaConLasFechas();
    if (problema) { this.avisar('Revisa las fechas', problema); this.paso = 'configurar'; return; }

    this.guardandoRango = true;
    this.rifaService.actualizarConfiguracion(this.rifaSeleccionada.id, {
      fechaHoraLimite: this.fechaHoraLimiteArmada(),
      fechaInicioBoletos: this.configFechaInicio,
      fechaFinBoletos: this.configFechaFin
    }).subscribe({
      next: res => {
        this.guardandoRango = false;
        this.aplicarRifaActualizada(res);
        this.paso = 'boletos';
      },
      error: err => {
        this.guardandoRango = false;
        this.paso = 'configurar';
        this.error('No se pudo guardar el rango', err);
      }
    });
  }

  // ── Ruleta ─────────────────────────────────────────────────────────

  cargarEstadoRuleta(): void {
    if (!this.rifaSeleccionada?.id) return;
    this.cargandoRuleta = true;
    this.rifaService.getEstadoPlataformas(this.rifaSeleccionada.id).subscribe({
      next: est => {
        this.cargandoRuleta = false;
        this.boletosEnJuego = est.boletosEnJuego ?? [];
        this.boletosDescartados = est.boletosDescartados ?? [];
        this.gruposEnJuego = this.agrupar(this.boletosEnJuego);
        this.gruposDescartados = this.agrupar(this.boletosDescartados);
        this.varianteActual = est.varianteActual;
        this.varianteNumeroActual = est.varianteNumeroActual;
        this.totalVariantes = est.totalVariantes;
        this.giroActual = est.giroActual;
        this.giroGanador = est.giroGanador;
        this.rifaTerminada = est.rifaTerminada;
        setTimeout(() => this.generarRuleta(), 150);
      },
      error: err => { this.cargandoRuleta = false; this.error('No se pudo cargar el estado de la rifa', err); }
    });
  }

  private agrupar(boletos: IBoletoRifaDto[]): IGrupoBoletos[] {
    const mapa = new Map<number, IGrupoBoletos>();
    boletos.forEach(b => {
      let g = mapa.get(b.concursanteId);
      if (!g) {
        g = { concursanteId: b.concursanteId, nombreCompleto: b.nombreCompleto, boletos: [], expandido: false };
        mapa.set(b.concursanteId, g);
      }
      g.boletos.push(b);
    });
    return Array.from(mapa.values()).sort((a, b) => b.boletos.length - a.boletos.length);
  }

  verDetalle(concursanteId: number): void {
    const todos = [...this.boletosEnJuego, ...this.boletosDescartados]
      .filter(b => b.concursanteId === concursanteId);
    if (!todos.length) return;
    this.detalleGrupo = {
      concursanteId,
      nombreCompleto: todos[0].nombreCompleto,
      boletos: todos,
      expandido: true
    };
  }

  cerrarDetalle(): void { this.detalleGrupo = null; }

  private generarRuleta(): void {
    this.chart?.destroy();
    if (!this.boletosEnJuego.length || !this.ruletaCanvas) return;

    // Un slot por boleto: quien tiene más boletos ocupa más rebanadas, que es
    // exactamente su probabilidad de salir.
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
        onClick: (_evt, elementos) => {
          if (!elementos.length) return;
          const slot = this.ruletaSlots[elementos[0].index];
          if (slot) this.verDetalle(slot.concursanteId);
        },
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
    if (!this.rifaSeleccionada?.id || this.sorteando || !this.boletosEnJuego.length) return;
    this.sorteando = true;
    this.descartadoActual = null;

    this.rifaService.sortearPlataformas(this.rifaSeleccionada.id).subscribe({
      next: resultado => {
        const idx = this.ruletaSlots.findIndex(b => b.id === resultado.boleto.id);
        setTimeout(() => {
          this.girarAnimacionHacia(idx >= 0 ? idx : 0, () => {
            this.sorteando = false;
            if (resultado.esGanador) {
              this.ganadorActual = resultado;
              this.lanzarConfetti();
              this.paso = 'ganador';
              this.cargarEstadoRuleta();
            } else {
              this.descartadoActual = resultado.boleto;
              setTimeout(() => {
                this.descartadoActual = null;
                this.cargarEstadoRuleta();
              }, 2500);
            }
          });
        }, 100);
      },
      error: err => { this.sorteando = false; this.error('No se pudo realizar el sorteo', err); }
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

  reiniciar(): void {
    if (!this.rifaSeleccionada?.id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Reiniciar la rifa?',
      text: 'Todos los boletos vuelven a estar en juego y se borran los giros.',
      showCancelButton: true, confirmButtonText: 'Reiniciar', cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed || !this.rifaSeleccionada?.id) return;
      this.rifaService.reiniciarPlataformas(this.rifaSeleccionada.id).subscribe({
        next: () => {
          this.ganadorActual = null;
          this.descartadoActual = null;
          this.paso = 'ruleta';
          this.cargarEstadoRuleta();
        },
        error: err => this.error('No se pudo reiniciar', err)
      });
    });
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

  nombreCompleto(c?: { nombre?: string; apellidoPaterno?: string } | null): string {
    if (!c) return '';
    return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
  }

  etiquetaRifa(r: IConfigurarRifa): string {
    const rango = r.fechaInicioBoletos ? ` · ${r.fechaInicioBoletos} a ${r.fechaFinBoletos}` : '';
    const estado = r.activa ? '' : ' · cerrada';
    return `Rifa #${r.id}${rango}${estado}`;
  }

  // ── Avisos ─────────────────────────────────────────────────────────

  private avisar(title: string, text: string): void {
    Swal.fire({ icon: 'warning', title, text, confirmButtonText: 'Entendido' });
  }

  private avisarOk(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 1800, showConfirmButton: false });
  }

  private error(title: string, err: any): void {
    Swal.fire({
      icon: 'error',
      title,
      text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
    });
  }
}
