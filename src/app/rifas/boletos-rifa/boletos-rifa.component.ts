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
  guardandoRango = false;
  creandoRifa = false;
  cambiandoModoPrueba = false;

  // ── Premios (variantes de la rifa) ─────────────────────────────────
  variantesRifa: IConfigurarRifaVariante[] = [];
  terminoBusca = '';
  variantesBusqueda: IVarianteResumen[] = [];
  buscandoVariante = false;
  varianteParaAgregar: IVarianteResumen | null = null;
  giroGanadorInput = 1;
  guardandoVariante = false;
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
  nuevoNombre = '';
  nuevoApellido = '';
  nuevoTelefono = '';
  guardandoParticipante = false;

  plataforma: PlataformaBoleto | '' = '';
  motivo = '';
  fecha = '';
  fechaMin = '';
  fechaMax = '';
  urlPerfilRedSocial = '';
  urlSeguimiento = '';
  urlsCompartido: string[] = [''];
  guardando = false;

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
    this.cargandoRifas = true;
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: res => {
        this.rifas = (res ?? []).filter(r => r.tipo === 'PLATAFORMAS');
        this.cargandoRifas = false;
        const inicial = rifaIdEstado
          ? this.rifas.find(r => r.id === rifaIdEstado)
          : (this.rifas.length === 1 ? this.rifas[0] : null);
        if (inicial) this.seleccionarRifa(inicial);
      },
      error: () => { this.cargandoRifas = false; }
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

  // ── Configuración de la rifa ───────────────────────────────────────

  onRifaChange(id: number): void {
    const rifa = this.rifas.find(r => r.id === id) ?? null;
    if (rifa) this.seleccionarRifa(rifa);
  }

  seleccionarRifa(rifa: IConfigurarRifa): void {
    this.rifaSeleccionada = rifa;
    this.concursanteSeleccionado = null;
    this.boletos = [];
    this.configFechaInicio = rifa.fechaInicioBoletos ?? '';
    this.configFechaFin = rifa.fechaFinBoletos ?? '';
    this.calcularRangoFecha(rifa);
    this.cargarPremios();
    this.cargarConcursantes();
  }

  // La rifa nace siempre como PRUEBA: se activa como real desde el botón, y solo
  // después de avisar si todavía no termina el periodo.
  crearRifa(): void {
    if (!this.configFechaInicio || !this.configFechaFin || this.creandoRifa) return;
    if (this.configFechaInicio > this.configFechaFin) {
      Swal.fire({ icon: 'error', title: 'Rango inválido', text: 'La fecha de inicio no puede ser posterior a la fecha fin.' });
      return;
    }
    this.creandoRifa = true;
    this.rifaService.configurarRifa({
      fechaHoraLimite: `${this.configFechaFin}T23:59`,
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
            this.rifas = [...this.rifas, rifa];
            this.seleccionarRifa(rifa);
          },
          error: err => { this.creandoRifa = false; this.error('No se pudieron guardar las fechas', err); }
        });
      },
      error: err => { this.creandoRifa = false; this.error('No se pudo crear la rifa', err); }
    });
  }

  get rangoConfigurado(): boolean {
    return !!this.rifaSeleccionada?.fechaInicioBoletos && !!this.rifaSeleccionada?.fechaFinBoletos;
  }

  get periodoTerminado(): boolean {
    const fin = this.rifaSeleccionada?.fechaFinBoletos;
    return !!fin && new Date().toISOString().slice(0, 10) > fin;
  }

  guardarRangoBoletos(): void {
    if (!this.rifaSeleccionada?.id || !this.configFechaInicio || !this.configFechaFin || this.guardandoRango) return;
    if (this.configFechaInicio > this.configFechaFin) {
      Swal.fire({ icon: 'error', title: 'Rango inválido', text: 'La fecha de inicio no puede ser posterior a la fecha fin.' });
      return;
    }
    this.guardandoRango = true;
    this.rifaService.actualizarConfiguracion(this.rifaSeleccionada.id, {
      fechaHoraLimite: `${this.configFechaFin}T23:59`,
      fechaInicioBoletos: this.configFechaInicio,
      fechaFinBoletos: this.configFechaFin
    }).subscribe({
      next: res => { this.guardandoRango = false; this.aplicarRifaActualizada(res); },
      error: err => { this.guardandoRango = false; this.error('No se pudo guardar el rango', err); }
    });
  }

  private aplicarRifaActualizada(res: IConfigurarRifa): void {
    this.rifaSeleccionada = res;
    const idx = this.rifas.findIndex(r => r.id === res.id);
    if (idx >= 0) this.rifas[idx] = res;
    this.calcularRangoFecha(res);
  }

  // Por default la rifa queda en prueba. Activarla como real antes de que termine
  // el periodo casi siempre es un error de dedo, así que se avisa -- y se puede
  // regresar a prueba mientras la rifa siga vigente.
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
    this.rifaService.getVariantesRifa(this.rifaSeleccionada.id).subscribe({
      next: res => { this.variantesRifa = res ?? []; }
    });
  }

  buscarVariante(): void { this.busqSubject.next(this.terminoBusca.trim()); }

  elegirVarianteBusqueda(v: IVarianteResumen): void {
    this.varianteParaAgregar = v;
    this.variantesBusqueda = [];
    this.terminoBusca = `${v.nombreProducto ?? ''} ${v.color ?? ''} ${v.talla ?? ''}`.trim();
  }

  agregarPremio(): void {
    if (!this.rifaSeleccionada?.id || !this.varianteParaAgregar?.id || this.guardandoVariante) return;
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
        this.varianteParaAgregar = null;
        this.terminoBusca = '';
        this.giroGanadorInput = 1;
        this.cargarPremios();
      },
      error: err => { this.guardandoVariante = false; this.error('No se pudo agregar el premio', err); }
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

  // Al dar clic en el premio se abre el detalle de esa variante con TODAS sus
  // imágenes en carrusel (las que ya estén cargadas en el catálogo).
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

  registrarParticipante(): void {
    if (!this.rifaSeleccionada?.id || !this.nuevoNombre.trim() || this.guardandoParticipante) return;
    this.guardandoParticipante = true;
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
        this.nuevoNombre = ''; this.nuevoApellido = ''; this.nuevoTelefono = '';
        this.mostrarFormParticipante = false;
        this.seleccionarConcursante(res);
      },
      error: err => { this.guardandoParticipante = false; this.error('No se pudo registrar al participante', err); }
    });
  }

  seleccionarConcursante(c: IConcursante): void {
    this.concursanteSeleccionado = c;
    this.resetForm();
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
      const pad = (n: number) => String(n).padStart(2, '0');
      const anio = hoy.getFullYear(); const mes = hoy.getMonth() + 1;
      this.fechaMin = `${anio}-${pad(mes)}-01`;
      this.fechaMax = `${anio}-${pad(mes)}-${pad(new Date(anio, mes, 0).getDate())}`;
    }
    const hoyStr = new Date().toISOString().slice(0, 10);
    this.fecha = (hoyStr >= this.fechaMin && hoyStr <= this.fechaMax) ? hoyStr : this.fechaMin;
  }

  resetForm(): void {
    this.plataforma = '';
    this.motivo = '';
    this.urlPerfilRedSocial = '';
    this.urlSeguimiento = '';
    this.urlsCompartido = [''];
    if (this.rifaSeleccionada) this.calcularRangoFecha(this.rifaSeleccionada);
  }

  agregarCampoUrl(): void { this.urlsCompartido.push(''); }

  quitarCampoUrl(index: number): void {
    this.urlsCompartido.splice(index, 1);
    if (this.urlsCompartido.length === 0) this.urlsCompartido = [''];
  }

  registrarBoleto(): void {
    if (!this.concursanteSeleccionado?.id || this.guardando) return;
    if (!this.urlPerfilRedSocial.trim()) {
      Swal.fire({ icon: 'error', title: 'Falta la URL', text: 'La URL del perfil para dar seguimiento es obligatoria.' });
      return;
    }
    this.guardando = true;
    this.rifaService.registrarBoleto({
      concursanteId: this.concursanteSeleccionado.id,
      plataforma: this.plataforma || null,
      motivo: this.motivo.trim() || null,
      fecha: this.fecha || null,
      urlPerfilRedSocial: this.urlPerfilRedSocial.trim(),
      urlSeguimiento: this.urlSeguimiento.trim() || null,
      urlsCompartido: this.urlsCompartido.map(u => u.trim()).filter(u => !!u)
    }).subscribe({
      next: boleto => {
        this.guardando = false;
        this.boletos = [boleto, ...this.boletos];
        if (this.concursanteSeleccionado) {
          this.concursanteSeleccionado.boletos = (this.concursanteSeleccionado.boletos ?? 0) + 1;
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
          if (this.concursanteSeleccionado) {
            this.concursanteSeleccionado.boletos = Math.max(0, (this.concursanteSeleccionado.boletos ?? 1) - 1);
          }
        },
        error: err => this.error('No se pudo eliminar', err)
      });
    });
  }

  // ── Navegación entre pasos ─────────────────────────────────────────

  irAPaso(paso: PasoPlataformas): void {
    if (paso === 'boletos' && !this.rangoConfigurado) {
      Swal.fire({ icon: 'warning', title: 'Falta el rango de fechas', text: 'Guarda primero las fechas de la rifa.' });
      return;
    }
    if (paso === 'ruleta') {
      if (!this.variantesRifa.length) {
        Swal.fire({ icon: 'warning', title: 'Falta el premio', text: 'Agrega al menos un premio a la rifa.' });
        return;
      }
      this.cargarEstadoRuleta();
    }
    this.paso = paso;
  }

  // ── Ruleta ─────────────────────────────────────────────────────────

  cargarEstadoRuleta(): void {
    if (!this.rifaSeleccionada?.id) return;
    this.rifaService.getEstadoPlataformas(this.rifaSeleccionada.id).subscribe({
      next: est => {
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
      error: err => this.error('No se pudo cargar el estado de la rifa', err)
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

  // Todos los boletos de una persona (en juego + descartados), que es lo que se
  // muestra al dar clic en su nombre.
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

  private error(title: string, err: any): void {
    Swal.fire({
      icon: 'error',
      title,
      text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.'
    });
  }
}
