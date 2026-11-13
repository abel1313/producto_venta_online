import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';
import { PagoService } from 'src/app/pedidos/pago.service';
import { IOpcionMesesDto, IOpcionPagoDto, ITerminalIniciarRequest } from 'src/app/pedidos/mis-pedidos/models/IPago.model';
import Swal from 'sweetalert2';
import { preguntarSiSeLoLlevo } from 'src/app/pedidos/entrega/entrega';
import { IVarianteResumen } from '../models/variante.model';
import { VarianteService, IVentaDirectaRequest, IVentaDirectaResponse, IClienteSinRegistro } from '../service/variante.service';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { IItemPromoCarrito } from 'src/app/promociones/models/promocion.model';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { correoOpcional, cumpleMinLetras, minLetras, MIN_LETRAS_NOMBRE, telefonoOpcional } from '../../shared/validadores-persona';
import { AbonoRequest, MetodoPago } from 'src/app/abonos/models/abono.model';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { generarHtmlTicket, imprimirTicket, ITicketArticulo } from 'src/app/shared/ticket.util';
import { hayVersionNueva } from 'src/app/shared/version-nueva.util';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { PedidosService } from 'src/app/pedidos/pedidos.service';
import { LugarEntregaService } from 'src/app/lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from 'src/app/lugares-entrega/models/lugar-entrega.model';

import { hoyIso } from '../../shared/fecha.util';
import { IPrecioGrupo, PrecioCantidadService } from 'src/app/precio-cantidad/precio-cantidad.service';
import { escaparHtml } from 'src/app/shared/escapar-html.util';
import { CampanasService, IBuscarPorCodigo, ICampana, IVerificacionCodigo } from 'src/app/campanas/campanas.service';
interface ILineaVenta {
  variante: IVarianteResumen;
  cantidad:  number;
  subTotal:  number;
  /** Precio por cantidad: el precio de grupo que le toca a esta línea (null = no le toca). */
  grupo?: IPrecioGrupo | null;
}

@Component({
  selector: 'app-venta-directa',
  templateUrl: './venta-directa.component.html',
  styleUrls: ['./venta-directa.component.scss']
})
export class VentaDirectaComponent implements OnInit, OnDestroy {

  modalClienteSinRegistro = false;
  private cobrarPendiente = false;
  /** Para la plantilla: el modal se abrió desde «Cobrar» (no desde el botón de agregar cliente). */
  get cobrarPendienteVisible(): boolean { return this.cobrarPendiente; }
  clienteForm: FormGroup;
  clienteSinRegistroModal: IClienteSinRegistro = null as any;

  // ── Cliente sin registro — creación + verificación de correo (2026-07-22) ──
  // Antes el modal solo guardaba el formulario en memoria; ahora crea el registro
  // real en el back (POST /v1/clientes-sin-registro) para poder verificar el correo
  // ANTES de cobrar — solo cuenta para la rifa si queda verificado o si dio teléfono.
  clienteSinRegistroId: number | null = null;
  clienteSinRegistroCorreoVerificado = false;
  pasoClienteSinRegistro: 'form' | 'verificar' = 'form';
  guardandoClienteSinRegistro = false;
  enviandoCodigoCSR = false;
  verificandoCodigoCSR = false;
  codigoEnviadoCSR = false;
  codigoVerificacionCSR = '';
  errorClienteSinRegistro = '';

  // ── Búsqueda de variantes (panel izquierdo) ────────────────────────
  terminoVariante  = '';
  resultados:      IVarianteResumen[] = [];
  buscandoVariante = false;
  private varSub$  = new Subject<string>();

  // ── Líneas de venta ────────────────────────────────────────────────
  lineas: ILineaVenta[] = [];
  promosCarrito: IItemPromoCarrito[] = [];
  get tienePromos(): boolean { return this.promosCarrito.length > 0; }

  // ── Cliente ────────────────────────────────────────────────────────
  terminoCliente       = '';
  clientes:            IClienteBusquedaDto[] = [];
  buscandoCliente      = false;
  clienteSeleccionado: IClienteBusquedaDto | null = null;
  private cliSub$      = new Subject<string>();
  private clienteResolvedId = 0;

  // ── Campaña (solo si hay una vigente) ─────────────────────────────
  /** La campaña vigente hoy; null = no hay y no se muestra nada de campaña. */
  campana: ICampana | null = null;
  private campanaCargada = false;
  campanaCodigo = '';
  /** El check «Cliente recurrente»: el administrador lo marca a mano y no hace falta código. */
  campanaRecurrente = false;
  campanaPrivacidad = false;
  /**
   * Regla del dueño (2026-11-10): «No registrar y cobrar» (a nombre del administrador) cobra SIEMPRE a precio normal, aunque esté marcada la casilla
   * «Cliente recurrente»: sin datos del cliente no se lleva el acumulado. Solo vive mientras se cobra esa venta (no toca la casilla).
   */
  private cobroSinDatos = false;
  verificacion: IVerificacionCodigo | null = null;
  /** Lo que lleva pagado un cliente reconocido SIN código (por su correo, teléfono o cliente). El back lo vuelve a calcular al cobrar. */
  avanceCliente: { acumulado: number; meta: number } | null = null;
  private avanceSeq = 0;
  verificando = false;

  // ── Forma de pago (cargada al inicio) ─────────────────────────────
  opcionesEstructuradas: IOpcionPagoDto[] = [];
  tipoPagoActivo:        IOpcionPagoDto | null = null;
  mesesSeleccionado:     IOpcionMesesDto | null = null;
  pagosYMesesId:         number | null = null;
  cargandoPagos          = false;
  errorPagos             = '';   // motivo si no se cargaron las formas de pago

  // ── Crédito ────────────────────────────────────────────────────────
  tipoPedido:       'NORMAL' | 'APARTADO' | 'FIADO' = 'NORMAL';
  observaciones     = '';

  // ── Datos de entrega (2026-07-23) — opcionales, aplican a cualquier tipo de venta ─────
  nombreReceptor    = '';
  direccionEntrega  = '';
  fechaEntrega      = '';
  lugarEntregaId: number | null = null;
  urlFacebook       = '';
  lugares: ILugarEntrega[] = [];
  readonly metodosCredito: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA'];
  metodoPagoCredito: MetodoPago = 'EFECTIVO';
  montoInicial      = 0;
  montoDadoContado  = 0;  // monto recibido en venta al contado con efectivo
  montoDadoEnganche = 0;  // monto recibido para el enganche en crédito

  get esEfectivoContado(): boolean {
    return (this.tipoPagoActivo?.formaPago ?? '').toUpperCase() === 'EFECTIVO';
  }

  get cambioContado(): number {
    return this.montoDadoContado > this.totalVenta
      ? +(this.montoDadoContado - this.totalVenta).toFixed(2)
      : 0;
  }

  get cambioEnganche(): number {
    return this.montoDadoEnganche > this.montoInicial && this.montoInicial > 0
      ? +(this.montoDadoEnganche - this.montoInicial).toFixed(2)
      : 0;
  }

  // ── Ticket ────────────────────────────────────────────────────────
  enviarCorreo  = false;
  // QR contactos del negocio (cargados en ngOnInit desde /v1/negocio/contactos)
  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;
  private qrInstagram: string | null = null;
  private qrTiktok: string | null = null;

  // ── Carrito preload ────────────────────────────────────────────────
  private cargadoDesdeCarrito = false;

  // ── Procesamiento / terminal ───────────────────────────────────────
  procesando       = false;
  mostrarTerminal  = false;
  ventaCreada:     IVentaDirectaResponse | null = null;
  estadoTerminal: 'idle'|'procesando'|'aprobado'|'rechazado'|'cancelado'|'bloqueado' = 'idle';
  errorTerminal:   string | null = null;
  intentId:        string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // ── Visor de imagen ────────────────────────────────────────────────
  mostrarVisor = false;
  imagenVisor  = '';
  nombreVisor  = '';

  // ── Auth ───────────────────────────────────────────────────────────
  idUsuario   = 0;
  isAdminUser = false;

  private destroy$    = new Subject<void>();
  private varianteSub!: Subscription;
  private clienteSub!:  Subscription;

  get esCredito(): boolean { return this.tipoPedido === 'APARTADO' || this.tipoPedido === 'FIADO'; }

  constructor(
    private readonly varianteService: VarianteService,
    private readonly clienteService:  ClienteService,
    private readonly pagoService:     PagoService,
    private readonly authService:     AuthService,
    private readonly usuarioService:  UsuarioService,
    private readonly router:          Router,
    private readonly carritoService:  CarritoVarianteService,
    private readonly abonoService:    AbonoService,
    private readonly negocioService:  NegocioService,
    private readonly pedidosService:  PedidosService,
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly precioCantidad: PrecioCantidadService,
    private readonly campanasService: CampanasService,
    private fb: FormBuilder
  ) {

    this.clienteForm = this.fb.group({
      nombre_persona: ['', [Validators.required, minLetras()]],
      segundo_nombre: ['', minLetras()],
      apeido_Paterno: ['', minLetras()],
      apeido_Materno: ['', minLetras()],
      fecha_Nacimiento: [''],
      sexo: [''],
      correo_Electronico: ['', correoOpcional],
      numero_Telefonico: ['', telefonoOpcional]
    });

  }

  openModalSinRegistro() {
    this.modalClienteSinRegistro = true;
  }

  // Cerrar (✕ o clic fuera). Si el registro YA se creó en el back (venimos del paso
  // de verificación) equivale a "omitir verificación" — el registro ya existe con
  // correoVerificado=false, así que se completa el flujo igual. Si todavía estamos
  // en el formulario (nada creado aún), es un cancelar real.
  closeModalModalSinRegistro() {
    if (this.clienteSinRegistroId && this.pasoClienteSinRegistro === 'verificar') {
      this.finalizarModalClienteSinRegistro();
      return;
    }
    this.modalClienteSinRegistro = false;
    this.pasoClienteSinRegistro = 'form';
    this.cobrarPendiente = false;
    this.errorClienteSinRegistro = '';
  }

  /** Clic en el fondo del modal: con una campaña vigente NO lo cierra (hay que pulsar «Guardar cliente», «No registrar» o la ✕). */
  alHacerClicEnElFondo(): void {
    if (!this.campana) {
      this.closeModalModalSinRegistro();
    }
  }

  /** Con campaña: el cliente no quiere registrarse. Se cierra el modal y se cobra sin cliente (a nombre del administrador), sin QR. */
  noRegistrarYCobrar(): void {
    this.modalClienteSinRegistro = false;
    this.pasoClienteSinRegistro = 'form';
    this.errorClienteSinRegistro = '';
    this.campanaPrivacidad = false;
    if (this.cobrarPendiente) {
      this.cobrarPendiente = false;
      this.ejecutarVentaConAdmin();
    }
  }

  // Paso 1: crea el registro en el back (antes solo se guardaba en memoria).
  // Si trae correo sin verificar, pasa al paso de verificación dentro del mismo
  // modal; si no hay correo, cierra directo (nada que verificar).
  guardarClienteSinRegistro(): void {
    if (this.clienteForm.invalid || this.guardandoClienteSinRegistro) return;
    // Con campaña vigente, registrar exige el Aviso de privacidad (sin él: «No registrar»).
    if (this.campana && !this.campanaPrivacidad) {
      this.errorClienteSinRegistro = 'Para registrar al cliente marca la casilla del Aviso de privacidad.';
      return;
    }
    this.guardandoClienteSinRegistro = true;
    this.errorClienteSinRegistro = '';
    const dto: IClienteSinRegistro = this.clienteForm.value;

    this.varianteService.crearClienteSinRegistro(dto).subscribe({
      next: res => {
        this.guardandoClienteSinRegistro = false;
        this.clienteSinRegistroModal = dto;
        this.clienteSinRegistroId = res.id;
        this.clienteSinRegistroCorreoVerificado = res.correoVerificado;
        this.clienteSeleccionado = null;
        this.terminoCliente = '';
        this.clientes = [];
        // La casilla de privacidad se acaba de marcar en este mismo modal: se conserva.
        const privacidad = this.campanaPrivacidad;
        this.olvidarCodigoDelClienteAnterior();
        this.campanaPrivacidad = privacidad;
        this.consultarAvanceDelCliente();
        this.actualizarCheckboxesTicket();

        // Con campaña vigente NO se pide el código de verificación del correo: el QR se manda igual (el correo solo sirve para eso).
        if (dto.correo_Electronico && !res.correoVerificado && !this.campana) {
          this.pasoClienteSinRegistro = 'verificar';
        } else {
          this.finalizarModalClienteSinRegistro();
        }
      },
      error: err => {
        this.guardandoClienteSinRegistro = false;
        this.errorClienteSinRegistro = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar el cliente.';
      }
    });
  }

  // Paso 2: envía el código de 6 dígitos al correo ya guardado en el paso 1.
  enviarCodigoCSR(): void {
    if (!this.clienteSinRegistroId || this.enviandoCodigoCSR) return;
    this.enviandoCodigoCSR = true;
    this.errorClienteSinRegistro = '';
    this.varianteService.enviarCodigoClienteSinRegistro(this.clienteSinRegistroId).subscribe({
      next: () => { this.enviandoCodigoCSR = false; this.codigoEnviadoCSR = true; },
      error: err => {
        this.enviandoCodigoCSR = false;
        this.errorClienteSinRegistro = (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo enviar el código.';
      }
    });
  }

  // Paso 3: verifica el código capturado. El admin puede omitir este paso — el
  // registro ya existe con correoVerificado=false y la venta se genera igual.
  verificarCodigoCSR(): void {
    if (!this.clienteSinRegistroId || this.codigoVerificacionCSR.length !== 6 || this.verificandoCodigoCSR) return;
    this.verificandoCodigoCSR = true;
    this.errorClienteSinRegistro = '';
    this.varianteService.verificarCodigoClienteSinRegistro(this.clienteSinRegistroId, this.codigoVerificacionCSR).subscribe({
      next: () => {
        this.verificandoCodigoCSR = false;
        this.clienteSinRegistroCorreoVerificado = true;
        this.codigoVerificacionCSR = '';
      },
      error: err => {
        this.verificandoCodigoCSR = false;
        this.errorClienteSinRegistro = (err?.error?.mensaje ?? err?.error?.message) ?? 'Código incorrecto o expirado.';
      }
    });
  }

  // Cierra el modal (verificado o no) y, si venía de "cobrar sin cliente → agregar
  // uno", retoma la venta pendiente.
  private finalizarModalClienteSinRegistro(): void {
    this.modalClienteSinRegistro = false;
    this.pasoClienteSinRegistro = 'form';
    this.codigoEnviadoCSR = false;
    this.codigoVerificacionCSR = '';
    this.errorClienteSinRegistro = '';

    if (this.cobrarPendiente) {
      this.cobrarPendiente = false;
      this.ejecutarVenta(0);
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Cliente sin registro agregado',
        text: `${this.clienteSinRegistroModal.nombre_persona} ${this.clienteSinRegistroModal.apeido_Paterno || ''}`.trim(),
        timer: 2000,
        showConfirmButton: false
      });
    }
  }

  limpiarClienteSinRegistro(): void {
    this.clienteSinRegistroModal = null as any;
    this.clienteSinRegistroId = null;
    this.clienteSinRegistroCorreoVerificado = false;
    this.clienteForm.reset();
    // Revisión 2026-11-09: antes se quedaba la verificación (y el código) del cliente quitado: la pantalla seguía mostrando su precio de campaña.
    this.terminoCliente = '';
    this.olvidarCodigoDelClienteAnterior();
    this.actualizarCheckboxesTicket();
  }

  /**
   * Cambió (o se quitó) el cliente de la venta: la verificación del código ya no vale. Si el código estaba confirmado como del cliente anterior
   * (estado OK) también se quita, para no mandar al back el código de otra persona; si no estaba confirmado se deja (flujo «código primero, cliente
   * después»: se pulsa «Buscar código» con el cliente ya elegido).
   */
  private olvidarCodigoDelClienteAnterior(): void {
    if (this.verificacion?.estado === 'OK') this.campanaCodigo = '';
    this.verificacion = null;
    this.avanceCliente = null;
    this.avanceSeq++;
    this.campanaPrivacidad = false;
    this.recalcularSubtotales();
  }
  /** Hay una versión nueva del front publicada y esta pestaña sigue con la vieja (se avisa; se recarga sola cuando el carrito está vacío). */
  hayVersionNueva = false;
  private vigiaVersion: ReturnType<typeof setInterval> | null = null;

  /** Venta directa se deja abierta todo el día: si se publicó una versión nueva, se recarga sola solo con el carrito vacío y sin cobro en curso. */
  @HostListener('document:visibilitychange')
  alCambiarVisibilidad(): void {
    if (!document.hidden) { void this.revisarVersion(); this.cargarCampana(); }
  }

  /**
   * ¿Hay algo a medias que una recarga perdería? Antes solo se miraba el carrito: con solo combos, un cliente elegido, el modal abierto, un código
   * escrito, el cobro con terminal o el «¿Imprimir ticket?» a la vista, la recarga lo borraba (revisión 2026-11-09).
   */
  private get hayAlgoAMedias(): boolean {
    return this.lineas.length > 0 || this.tienePromos || this.procesando || !!this.clienteSeleccionado || !!this.clienteSinRegistroModal
      || this.modalClienteSinRegistro || !!this.campanaCodigo.trim() || this.mostrarTerminal || this.cobroTerminalVisible || Swal.isVisible();
  }

  private async revisarVersion(): Promise<void> {
    if (!(await hayVersionNueva())) return;
    if (!this.hayAlgoAMedias) { window.location.reload(); return; }
    this.hayVersionNueva = true;
  }

  /** Campaña vigente: sin ella (o sin permiso) la venta es la de siempre. Se vuelve a pedir al regresar a la pestaña y cada 10 min (se deja abierta todo el día). */
  private cargarCampana(): void {
    // A media venta no se vuelve a pedir (un error de red daría «sin campaña» y cambiaría los precios a la vista); solo se revisa la fecha.
    if (this.campanaCargada && this.hayAlgoAMedias) { this.revisarVigenciaLocal(); return; }
    this.campanaCargada = true;
    this.campanasService.activa().pipe(takeUntil(this.destroy$)).subscribe(c => {
      this.campana = c && c.vigente ? c : null;
      this.revisarVigenciaLocal();
      this.recalcularSubtotales();
    });
  }

  /** Con la fecha LOCAL: el último día (fechaFin) sigue vigente todo el día; al día siguiente ya no (aunque la pestaña siga abierta desde ayer). */
  private revisarVigenciaLocal(): void {
    const c = this.campana;
    if (!c) return;
    const hoy = hoyIso();
    if ((c.fechaFin && hoy > c.fechaFin.slice(0, 10)) || (c.fechaInicio && hoy < c.fechaInicio.slice(0, 10))) {
      this.campana = null;
      this.verificacion = null;
      this.avanceCliente = null;
      this.recalcularSubtotales();
    }
  }

  ngOnInit(): void {
    this.vigiaVersion = setInterval(() => { void this.revisarVersion(); this.cargarCampana(); }, 10 * 60 * 1000);
    this.cargarCampana();
    this.authService.userRoles$.pipe(takeUntil(this.destroy$)).subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.idUsuario = id;
    });

    // Pre-cargar items del carrito si el admin llega desde /tienda/carrito
    if (this.isAdminUser && this.lineas.length === 0) {
      const itemsCarrito = this.carritoService.obtener();
      const promosCarrito = this.carritoService.obtenerPromos();
      if (itemsCarrito.length > 0 || promosCarrito.length > 0) {
        this.cargadoDesdeCarrito = true;
        this.lineas = itemsCarrito.map(item => ({
          variante: {
            id:           item.varianteId,
            productoId:   item.productoId   ?? null,
            talla:        item.talla        ?? null,
            color:        item.color        ?? null,
            marca:        item.marca        ?? null,
            presentacion: item.presentacion ?? null,
            stock:        item.stock,
            precio:       item.precio,
            imagenUrl:    item.imagenUrl    ?? null,
            imagenBase64: item.imagenBase64 ?? null,
            codigoBarras: null
          } as IVarianteResumen,
          cantidad: item.cantidad,
          subTotal: item.subTotal
        }));
        this.promosCarrito = promosCarrito;
        this.repreciar();
        if (promosCarrito.length > 0) this.tipoPedido = 'NORMAL';
      }
    }

    // Cargar formas de pago al iniciar
    this.cargarPagos();

    // Catálogo de lugares de entrega, para el select de la sección de datos de entrega
    this.lugarEntregaService.getAll().subscribe({
      next: data => { this.lugares = data; },
      error: () => {}
    });

    // Búsqueda de variantes con debounce
    this.varianteSub = this.varSub$.pipe(
      filter(t => t.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(t => this.buscarVariantes(t));

    // Búsqueda de clientes con debounce
    this.clienteSub = this.cliSub$.pipe(
      filter(t => t.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.buscarClientes());

    // Cargar URLs de contacto del negocio para QR en ticket (silencioso si falla)
    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl; this.qrFacebook = c.facebookUrl; this.qrInstagram = c.instagramUrl ?? null; this.qrTiktok = c.tiktokUrl ?? null; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    if (this.vigiaVersion) clearInterval(this.vigiaVersion);
    this.destroy$.next(); this.destroy$.complete();
    this.varianteSub?.unsubscribe();
    this.clienteSub?.unsubscribe();
    this.stopPolling();
  }

  // ── Pagos ──────────────────────────────────────────────────────────

  private cargarPagos(): void {
    this.cargandoPagos = true;
    this.errorPagos    = '';
    this.pagoService.getOpcionesEstructuradas().subscribe({
      next: res => {
        this.opcionesEstructuradas = res.data ?? [];
        this.cargandoPagos = false;
        // Si el back respondió OK pero sin ninguna forma de pago, hay que avisarlo:
        // sin opciones el admin no puede seleccionar pago y "Cobrar" nunca se habilita.
        if (this.opcionesEstructuradas.length === 0) {
          this.errorPagos = 'No hay formas de pago configuradas en el sistema. Pídele al administrador que las dé de alta antes de cobrar.';
        }
      },
      error: err => {
        this.cargandoPagos = false;
        this.opcionesEstructuradas = [];
        this.errorPagos = (err?.error?.mensaje ?? err?.error?.message)
          ?? 'No se pudieron cargar las formas de pago. Revisa tu conexión e inténtalo de nuevo.';
      }
    });
  }

  reintentarPagos(): void { this.cargarPagos(); }

  seleccionarTipoPago(opcion: IOpcionPagoDto): void {
    this.tipoPagoActivo    = opcion;
    this.mesesSeleccionado = null;
    this.pagosYMesesId     = opcion.mostrarMeses ? null : opcion.pagosYMesesId;
    this.tipoPedido        = 'NORMAL';
    this.montoDadoContado  = 0;
    this.recalcularSubtotales();
  }

  seleccionarMeses(opcion: IOpcionMesesDto): void {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId     = opcion.pagosYMesesId;
  }

  seleccionarContado(): void {
    this.pasoAIrPagando    = false;
    this.tipoPedido        = 'NORMAL';
    this.metodoPagoCredito = 'EFECTIVO';
    this.montoInicial      = 0;
    this.recalcularSubtotales();
  }

  /** Se eligió Apartado y luego se escribió un enganche: quedó como Ir pagando. */
  pasoAIrPagando = false;

  /** Un Apartado es sin dinero: si el cliente da algo, el pedido es Ir pagando. */
  alCambiarEnganche(monto: number): void {
    this.montoInicial = monto;
    if (this.tipoPedido === 'APARTADO' && monto > 0) {
      this.tipoPedido     = 'FIADO';
      this.pasoAIrPagando = true;
      this.recalcularSubtotales();
    }
  }

  seleccionarCredito(tipo: 'APARTADO' | 'FIADO'): void {
    if (this.tipoPedido === tipo) return;
    this.pasoAIrPagando    = false;
    this.tipoPedido        = tipo;
    this.tipoPagoActivo    = null;
    this.mesesSeleccionado = null;
    this.pagosYMesesId     = null;
    this.metodoPagoCredito = 'EFECTIVO';
    this.montoInicial      = 0;
    this.recalcularSubtotales();
  }

  // ── Búsqueda de variantes ──────────────────────────────────────────

  /** El código llegó del celular (botón «📱»): se busca como si se hubiera escrito en el buscador. */
  alRecibirCodigoDelCelular(codigo: string): void {
    this.terminoVariante = codigo.toUpperCase();
    // Directo, sin el debounce/distinct del tecleo: escanear dos veces el mismo artículo seguido es lo normal en el mostrador.
    this.buscarVariantes(this.terminoVariante);
  }

  onInputVariante(): void {
    if (!this.terminoVariante.trim()) { this.resultados = []; return; }
    this.varSub$.next(this.terminoVariante);
  }

  private buscarVariantes(termino: string): void {
    this.buscandoVariante = true;
    this.varianteService.buscar({ termino, pagina: 1, size: 10 }).subscribe({
      next: res => { this.resultados = res.t ?? []; this.buscandoVariante = false; },
      error: ()  => { this.buscandoVariante = false; }
    });
  }

  // ── Líneas de venta ────────────────────────────────────────────────

  agregarAVenta(v: IVarianteResumen): void {
    const idx = this.lineas.findIndex(l => l.variante.id === v.id);
    if (idx !== -1) {
      if (this.lineas[idx].cantidad >= (v.stock ?? 0)) {
        Swal.fire({ icon: 'warning', title: 'Sin stock suficiente', timer: 1400, showConfirmButton: false });
        return;
      }
      this.lineas[idx].cantidad++;
    } else {
      if ((v.stock ?? 0) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Artículo sin stock', timer: 1400, showConfirmButton: false });
        return;
      }
      this.lineas.push({ variante: v, cantidad: 1, subTotal: v.precio ?? 0 });
    }
    this.repreciar();
  }

  incrementar(linea: ILineaVenta): void {
    if (linea.cantidad >= (linea.variante.stock ?? 0)) return;
    linea.cantidad++;
    this.repreciar();
  }

  decrementar(linea: ILineaVenta): void {
    if (linea.cantidad <= 1) { this.quitarLinea(this.lineas.indexOf(linea)); return; }
    linea.cantidad--;
    this.repreciar();
  }

  quitarLinea(i: number): void { this.lineas.splice(i, 1); this.repreciar(); }

  // ── Precio por cantidad (grupos de precio) ─────────────────────────────────
  // Las piezas se suman por producto dentro de su grupo; el back dice a quién le toca y ESE cálculo es el que cuenta al guardar. Gana el
  // precio más bajo: el de grupo solo se usa si es menor al precio de la línea (si el admin ya puso una rebaja menor, se queda).

  /** Lo que de verdad cuesta cada pieza de la línea: el precio más bajo entre el de la línea, el de grupo y el de campaña. */
  precioUnitarioDe(l: ILineaVenta): number {
    const base = l.variante.precio ?? 0;
    const conGrupo = l.grupo && l.grupo.precioPromocion < base ? l.grupo.precioPromocion : base;
    const camp = this.precioCampanaDe(l);
    return camp !== null && camp < conGrupo ? camp : conGrupo;
  }

  /** ¿Esta línea se está cobrando con precio de grupo? (si gana el de campaña, se cuenta como campaña) */
  conPrecioDeGrupo(l: ILineaVenta): boolean {
    return !!l.grupo && l.grupo.precioPromocion < (l.variante.precio ?? 0) && !this.conPrecioDeCampana(l);
  }

  /** ¿Esta línea se está cobrando con el precio de campaña? */
  conPrecioDeCampana(l: ILineaVenta): boolean {
    const camp = this.precioCampanaDe(l);
    if (camp === null) return false;
    const base = l.variante.precio ?? 0;
    const conGrupo = l.grupo && l.grupo.precioPromocion < base ? l.grupo.precioPromocion : base;
    return camp < conGrupo;
  }

  /** Lo que ahorra la línea por el precio de grupo o de campaña. */
  ahorroDe(l: ILineaVenta): number {
    return this.conPrecioDeGrupo(l) || this.conPrecioDeCampana(l)
      ? +(((l.variante.precio ?? 0) - this.precioUnitarioDe(l)) * l.cantidad).toFixed(2) : 0;
  }

  get ahorroTotal(): number {
    return +this.lineas.filter(l => this.conPrecioDeGrupo(l)).reduce((s, l) => s + this.ahorroDe(l), 0).toFixed(2);
  }

  get ahorroCampanaTotal(): number {
    return +this.lineas.filter(l => this.conPrecioDeCampana(l)).reduce((s, l) => s + this.ahorroDe(l), 0).toFixed(2);
  }

  // ── Campaña ────────────────────────────────────────────────────────────────
  // El back decide todo (quién es recurrente, qué precio); esto solo lo muestra igual para que el total no sorprenda. Si el cálculo del back
  // fuera distinto, el back rechaza el precio y no se cobra mal.

  private esDeCampana(l: ILineaVenta): boolean {
    return !!this.campana?.productos.some(p => p.productoId === l.variante.productoId);
  }

  get hayJuguetesDeCampana(): boolean { return this.lineas.some(l => this.esDeCampana(l)); }

  /** Lo que ya lleva pagado el cliente y la meta: de su código verificado o, sin código, de su cliente reconocido. */
  get avance(): { acumulado: number; meta: number } | null {
    const v = this.verificacion;
    if (v && v.estado === 'OK') return { acumulado: v.acumulado, meta: v.meta };
    return this.avanceCliente;
  }

  /** El precio de una pieza SIN precio de campaña: el normal o el de grupo si es más bajo (lo que ya llevaba). */
  private precioSinCampanaDe(l: ILineaVenta): number {
    const base = l.variante.precio ?? 0;
    return l.grupo && l.grupo.precioPromocion < base ? l.grupo.precioPromocion : base;
  }

  /**
   * Lo de ESTE ticket que suma para la meta (regla del dueño 2026-11-10): solo lo que NO son juguetes de la campaña, y solo si la venta es Contado
   * (se paga ahora). Los juguetes no cuentan para calificarse a sí mismos. Es el mismo cálculo que hace el back, que decide al cobrar.
   */
  get ticketQueSuma(): number {
    if (this.tipoPedido !== 'NORMAL') return 0;
    return +this.lineas.filter(l => !this.esDeCampana(l))
      .reduce((t, l) => t + this.precioSinCampanaDe(l) * l.cantidad, 0).toFixed(2);
  }

  /** Lo que todavía le falta para la meta contando lo ya pagado y lo que no son juguetes de este ticket (0 si ya llega). */
  get faltaParaMeta(): number {
    const a = this.avance;
    if (!a || a.meta <= 0) return 0;
    return Math.max(0, +(a.meta - a.acumulado - this.ticketQueSuma).toFixed(2));
  }

  /** ¿Este cliente es recurrente ahora? A mano, o lo ya pagado + lo que no son juguetes de este ticket llega a la meta. Se recalcula al agregar o quitar artículos. */
  get esRecurrente(): boolean {
    if (!this.campana) return false;
    if (this.campanaRecurrente) return true;
    const a = this.avance;
    return !!a && a.meta > 0 && a.acumulado + this.ticketQueSuma >= a.meta;
  }

  /** Cliente ya elegido (registrado o sin registro) y sin código: pregunta cuánto lleva pagado para saber su precio al momento. */
  private consultarAvanceDelCliente(): void {
    if (!this.campana) return;
    const k = this.contactoClienteCampana;
    const clienteId = this.clienteSeleccionado?.id ?? null;
    const sinRegistroId = this.clienteSinRegistroId ?? null;
    if (!k.correo && !k.telefono && !clienteId && !sinRegistroId) return;
    const seq = ++this.avanceSeq;
    this.campanasService.acumuladoDelCliente({ correo: k.correo, telefono: k.telefono, clienteId, clienteSinRegistroId: sinRegistroId }).subscribe({
      next: v => {
        if (seq !== this.avanceSeq) return;          // cambió el cliente mientras respondía
        this.avanceCliente = v.estado === 'OK' && v.meta > 0 ? { acumulado: v.acumulado, meta: v.meta } : null;
        this.recalcularSubtotales();
      },
      error: () => { /* sin aviso: el back decide igual al cobrar */ }
    });
  }

  /** El precio de campaña de la línea, o null si no le toca (no es juguete, no es recurrente o la venta es Ir pagando). */
  private precioCampanaDe(l: ILineaVenta): number | null {
    if (!this.campana || this.cobroSinDatos || !this.esRecurrente || this.tipoPedido === 'FIADO') return null;
    const p = this.campana.productos.find(x => x.productoId === l.variante.productoId);
    return p && p.precio < (l.variante.precio ?? 0) ? p.precio : null;
  }

  /** Aviso cuando se pasa a Ir pagando una venta que sí llevaría precio de campaña. */
  get avisoIrPagandoSinDescuento(): boolean {
    // Solo si de verdad le tocaría (recurrente): antes salía también con un código OK que aún no llegaba a la meta (revisión 2026-11-09).
    return !!this.campana && this.tipoPedido === 'FIADO' && this.hayJuguetesDeCampana && this.esRecurrente;
  }

  get contactoClienteCampana(): { correo: string | null; telefono: string | null } {
    const c = this.clienteSeleccionado;
    const s = this.clienteSinRegistroModal;
    return {
      correo: (c?.correoElectronico || s?.correo_Electronico || '') || null,
      telefono: (c?.numeroTelefonico || s?.numero_Telefonico || '') || null
    };
  }

  get clienteTieneContacto(): boolean {
    const k = this.contactoClienteCampana;
    return !!(k.correo || k.telefono);
  }

  recalcularSubtotales(): void {
    this.lineas.forEach(l => { l.subTotal = l.cantidad * this.precioUnitarioDe(l); });
  }

  private static readonly UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** El código cambió (escrito, pegado, de la imagen del QR, de la cámara o del celular). Un UUID completo se busca solo: llena al cliente. */
  alCambiarCodigo(codigo: string): void {
    this.campanaCodigo = codigo;
    this.verificacion = null;
    this.recalcularSubtotales();
    if (VentaDirectaComponent.UUID.test(codigo.trim())) {
      this.buscarCodigo();
    }
  }

  alCambiarRecurrente(): void { this.recalcularSubtotales(); }

  /** Escanear el QR: ¿de quién es este código? Si es válido, se llenan solos los datos del cliente y se ve lo que lleva. */
  buscarCodigo(): void {
    const codigo = this.campanaCodigo.trim();
    if (!codigo || this.verificando) return;
    this.verificando = true;
    this.campanasService.buscarPorCodigo(codigo).subscribe({
      next: r => {
        this.verificando = false;
        // Si mientras respondía se cambió o quitó el código, esta respuesta ya no aplica (antes volvía a poner el código viejo y su cliente).
        if (this.campanaCodigo.trim() !== codigo) {
          if (VentaDirectaComponent.UUID.test(this.campanaCodigo.trim())) this.buscarCodigo();
          return;
        }
        void this.aplicarCodigo(codigo, r);
      },
      error: e => {
        this.verificando = false;
        Swal.fire({ icon: 'warning', title: 'No se pudo revisar el código', text: e?.error?.mensaje || 'Intenta de nuevo.' });
      }
    });
  }

  private async aplicarCodigo(codigo: string, r: IBuscarPorCodigo): Promise<void> {
    if (!r.valido) {
      this.verificacion = { estado: 'NO_EXISTE', nombre: '', acumulado: 0, meta: r.meta, falta: 0 };
      this.recalcularSubtotales();
      return;
    }
    const tieneCliente = !!(r.clienteId || r.clienteSinRegistroId);
    if (!tieneCliente) {
      // Código anterior al ligado con el cliente: no se sabe a cuál pertenece. Se deja elegir al cliente y se valida por correo o teléfono.
      if (this.clienteTieneContacto) {
        this.verificarCodigo();
      } else {
        Swal.fire({ icon: 'info', title: `Código de ${r.nombre || 'un cliente'}`,
          text: 'Este código no tiene un cliente ligado. Elige al cliente de la venta y pulsa «Buscar código».' });
      }
      return;
    }
    const mismo = (!!r.clienteId && this.clienteSeleccionado?.id === r.clienteId)
      || (!!r.clienteSinRegistroId && this.clienteSinRegistroId === r.clienteSinRegistroId);
    const hayOtro = !mismo && (!!this.clienteSeleccionado || !!this.clienteSinRegistroModal);
    if (hayOtro) {
      const ok = await Swal.fire({
        icon: 'question', title: `Este código es de ${r.nombre || 'otro cliente'}`,
        text: 'La venta ya tiene otro cliente. ¿Cambiarlo por el dueño del código?',
        showCancelButton: true, confirmButtonText: 'Sí, cambiar', cancelButtonText: 'No'
      });
      if (!ok.isConfirmed) {
        this.campanaCodigo = '';
        return;
      }
    }
    if (r.clienteId) {
      // Cliente registrado: se selecciona como si se hubiera buscado.
      this.clienteSinRegistroModal = null as any;
      this.clienteSinRegistroId = null;
      this.clienteSeleccionado = {
        id: r.clienteId, nombrePersona: r.nombre, apeidoPaterno: '', apeidoMaterno: '',
        correoElectronico: r.correo ?? '', numeroTelefonico: r.telefono ?? '', correoVerificado: undefined
      } as IClienteBusquedaDto;
      this.terminoCliente = r.nombre;
    } else {
      // Cliente sin registro de su primera compra.
      this.clienteSeleccionado = null;
      this.clienteSinRegistroId = r.clienteSinRegistroId;
      this.clienteSinRegistroModal = {
        nombre_persona: r.nombre, segundo_nombre: '', apeido_Paterno: '', apeido_Materno: '', fecha_Nacimiento: '', sexo: '',
        correo_Electronico: r.correo ?? '', numero_Telefonico: r.telefono ?? ''
      } as IClienteSinRegistro;
      this.terminoCliente = r.nombre;
    }
    this.clientes = [];
    this.campanaCodigo = codigo;
    this.verificacion = { estado: 'OK', nombre: r.nombre, acumulado: r.acumulado, meta: r.meta, falta: r.falta };
    this.actualizarCheckboxesTicket();
    this.recalcularSubtotales();
  }

  verificarCodigo(): void {
    const k = this.contactoClienteCampana;
    if (!this.campanaCodigo.trim()) return;
    if (!k.correo && !k.telefono) {
      Swal.fire({ icon: 'info', title: 'Elige primero al cliente', text: 'El código se comprueba contra el correo o el teléfono del cliente de la venta.' });
      return;
    }
    this.verificando = true;
    const codigo = this.campanaCodigo.trim();
    this.campanasService.verificarCodigo(codigo, k.correo, k.telefono).subscribe({
      next: v => {
        this.verificando = false;
        if (this.campanaCodigo.trim() !== codigo) return;     // el código cambió mientras respondía
        this.verificacion = v;
        this.recalcularSubtotales();
      },
      error: e => {
        this.verificando = false;
        Swal.fire({ icon: 'warning', title: 'No se pudo verificar', text: e?.error?.mensaje || 'Intenta de nuevo.' });
      }
    });
  }

  private pedidoPrecios = 0;

  /** Recalcula los subtotales al momento (sin grupo) y pide al back a qué productos les toca su precio de grupo. */
  private repreciar(): void {
    this.lineas.forEach(l => { l.subTotal = l.cantidad * this.precioUnitarioDe(l); });
    const pedido = ++this.pedidoPrecios;
    const porProducto = new Map<number, number>();
    this.lineas.forEach(l => {
      const p = l.variante.productoId ?? 0;
      if (p > 0) porProducto.set(p, (porProducto.get(p) ?? 0) + l.cantidad);
    });
    this.precioCantidad.calcular([...porProducto].map(([productoId, cantidad]) => ({ productoId, cantidad }))).subscribe(precios => {
      if (pedido !== this.pedidoPrecios) return;   // llegó una respuesta vieja: ya hay otra consulta en camino
      const porId = new Map(precios.map(p => [p.productoId, p]));
      this.lineas.forEach(l => {
        l.grupo = porId.get(l.variante.productoId ?? 0) ?? null;
        l.subTotal = l.cantidad * this.precioUnitarioDe(l);
      });
    });
  }

  // Solo quita el combo de ESTA venta en curso, igual que quitarLinea(). El carrito
  // real se limpia hasta el final, en limpiarTodo(), si la venta vino de ahí.
  quitarPromo(i: number): void { this.promosCarrito.splice(i, 1); }

  limpiarVenta(): void {
    Swal.fire({
      title: '¿Limpiar la venta?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar', confirmButtonColor: 'var(--pk-danger)'
    }).then(r => { if (r.isConfirmed) this.limpiarTodo(); });
  }

  private limpiarTodo(): void {
    this.lineas = [];
    this.clienteSeleccionado = null;
    this.clienteSinRegistroModal = null as any;
    this.clienteSinRegistroId = null;
    this.clienteSinRegistroCorreoVerificado = false;
    this.pasoClienteSinRegistro = 'form';
    this.codigoEnviadoCSR = false;
    this.codigoVerificacionCSR = '';
    this.errorClienteSinRegistro = '';
    this.clienteForm.reset();
    this.terminoCliente = '';
    this.clienteResolvedId = 0;
    this.ventaCreada = null;
    this.mostrarTerminal = false;
    this.estadoTerminal = 'idle';
    this.tipoPedido = 'NORMAL';
    this.campanaCodigo = '';
    this.campanaRecurrente = false;
    this.campanaPrivacidad = false;
    this.cobroSinDatos = false;
    this.verificacion = null;
    this.avanceCliente = null;
    this.avanceSeq++;
    this.observaciones = '';
    this.nombreReceptor = '';
    this.direccionEntrega = '';
    this.fechaEntrega = '';
    this.lugarEntregaId = null;
    this.urlFacebook = '';
    this.metodoPagoCredito = 'EFECTIVO';
    this.montoInicial = 0;
    this.montoDadoContado = 0;
    this.montoDadoEnganche = 0;
    this.cobrarPendiente   = false;
    this.enviarCorreo      = false;
    this.promosCarrito     = [];
    if (this.cargadoDesdeCarrito) {
      this.carritoService.limpiar();
      this.cargadoDesdeCarrito = false;
    }
    this.refrescarResultados();
  }

  /**
   * Después de vender (o limpiar), los resultados del buscador se vuelven a pedir: antes se quedaba
   * la lista de antes de la venta, con el stock viejo ("dice 1") y al elegirlo otra vez el back
   * respondía que ya no había stock (QA 2026-10-08).
   */
  private refrescarResultados(): void {
    const termino = this.terminoVariante.trim();
    if (termino.length >= 3) this.buscarVariantes(termino);
    else this.resultados = [];
  }

  get totalVenta(): number {
    const v = this.lineas.reduce((s, l) => s + l.subTotal, 0);
    const p = this.promosCarrito.reduce((s, p) => s + p.precioTotal * p.cantidadCombos, 0);
    return v + p;
  }
  get totalUnidades(): number {
    const v = this.lineas.reduce((s, l) => s + l.cantidad, 0);
    const p = this.promosCarrito.reduce((s, pr) => s + pr.cantidadCombos, 0);
    return v + p;
  }

  get puedeCobrar(): boolean {
    const tieneItems     = this.lineas.length > 0 || this.tienePromos;
    const tieneFormaPago = this.esCredito || this.pagosYMesesId !== null;
    return tieneItems && tieneFormaPago && !this.procesando && !this.nombreReceptorInvalido;
  }

  readonly minLetrasNombre = MIN_LETRAS_NOMBRE;

  // Opcional, pero si se escribe necesita al menos 3 letras (se guardaban nombres como "a").
  get nombreReceptorInvalido(): boolean {
    return !cumpleMinLetras(this.nombreReceptor);
  }

  // ── Visor de imagen ────────────────────────────────────────────────

  verImagen(url: string | null | undefined, nombre: string): void {
    if (!url) return;
    this.imagenVisor = url;
    this.nombreVisor  = nombre;
    this.mostrarVisor = true;
  }
  cerrarVisor(): void { this.mostrarVisor = false; }

  labelVariante(v: IVarianteResumen): string {
    return [v.talla, v.color, v.marca].filter(Boolean).join(' · ') || `Artículo #${v.id}`;
  }

  // ── Cliente ────────────────────────────────────────────────────────

  onInputCliente(): void { this.cliSub$.next(this.terminoCliente); }

  buscarClientes(): void {
    this.buscandoCliente = true;
    this.clienteService.buscarClientes(this.terminoCliente, 0, 10).subscribe({
      next: (res: any) => { this.clientes = res.data?.list ?? []; this.buscandoCliente = false; },
      error: () => { this.buscandoCliente = false; }
    });
  }

  seleccionarCliente(c: IClienteBusquedaDto): void {
    this.clienteSeleccionado = c;
    this.terminoCliente = `${c.nombrePersona} ${c.apeidoPaterno}`;
    this.clientes = [];
    this.olvidarCodigoDelClienteAnterior();
    this.consultarAvanceDelCliente();
    this.actualizarCheckboxesTicket();
  }

  limpiarCliente(): void {
    this.clienteSeleccionado = null;
    this.olvidarCodigoDelClienteAnterior();
    this.terminoCliente = '';
    this.clientes = [];
    this.actualizarCheckboxesTicket();
  }

  private actualizarCheckboxesTicket(): void {
    const correo = this.clienteSeleccionado?.correoElectronico
      ?? this.clienteSinRegistroModal?.correo_Electronico ?? '';
    const tel = this.clienteSeleccionado?.numeroTelefonico
      ?? this.clienteSinRegistroModal?.numero_Telefonico ?? '';
    // No se activa por default — el admin decide si enviarlo
    this.enviarCorreo = false;
  }

  get correoDisponible(): boolean {
    return !!(this.clienteSeleccionado?.correoElectronico ?? this.clienteSinRegistroModal?.correo_Electronico);
  }

  get nombreClienteTicket(): string {
    if (this.clienteSinRegistroModal) {
      return [this.clienteSinRegistroModal.nombre_persona, this.clienteSinRegistroModal.apeido_Paterno]
        .filter(Boolean).join(' ');
    }
    if (this.clienteSeleccionado) {
      return `${this.clienteSeleccionado.nombrePersona} ${this.clienteSeleccionado.apeidoPaterno}`.trim();
    }
    return 'Sin cliente';
  }

  // ── Cobrar — un solo request ───────────────────────────────────────

  cobrar(): void {
    if (!this.puedeCobrar) return;

    if (this.clienteSinRegistroModal) {
      this.ejecutarVenta(0);
    } else if (this.clienteSeleccionado) {
      this.clienteResolvedId = this.clienteSeleccionado.id;
      // Si el correo no está verificado, se OFRECE verificarlo — nunca se bloquea
      // la venta: si el cliente no quiere o no trae el código a la mano, se cobra igual.
      // Con campaña vigente tampoco se ofrece: el QR sale al correo sin verificarlo.
      if (this.clienteSeleccionado.correoVerificado === false && this.clienteSeleccionado.correoElectronico && !this.campana) {
        this.ofrecerVerificarCorreo();
        return;
      }
      this.ejecutarVenta(this.clienteResolvedId);
    } else {
      // Sin cliente → preguntar si quiere agregar uno para la rifa
      // Con una campaña vigente esta ventana NO se cierra con un clic fuera ni con Esc: hay que elegir (registrar al cliente para darle su QR, o no).
      const hayCampana = !!this.campana;
      Swal.fire({
        icon: 'question',
        title: hayCampana ? '¿Registrar los datos del cliente?' : '¿Agregar cliente para la rifa?',
        text: hayCampana
          ? `Hay una campaña vigente («${this.campana!.nombre}»). Si registras al cliente se le crea su código QR y se le manda por correo. Sin datos del cliente no se aplica el precio de campaña.`
          : 'No hay cliente seleccionado. ¿Desea registrar uno antes de cobrar?',
        showCancelButton: true,
        confirmButtonText: hayCampana ? 'Sí, registrar cliente' : 'Sí, agregar cliente',
        cancelButtonText: hayCampana ? 'No registrar' : 'No, cobrar sin cliente',
        reverseButtons: true,
        allowOutsideClick: !hayCampana,
        allowEscapeKey: !hayCampana
      }).then(result => {
        if (result.isConfirmed) {
          this.cobrarPendiente = true;
          this.openModalSinRegistro();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // Solo el botón «No…» cobra sin cliente. Cerrar la ventana (clic fuera o Esc) ya NO cobra a nombre del administrador.
          this.ejecutarVentaConAdmin();
        }
      });
    }
  }

  // ── Verificación de correo antes de cobrar ───────────────────────────────
  // Se ofrece, no se exige: en mostrador el cliente puede no traer el correo a la
  // mano. Cualquier salida que no sea "verificado con éxito" termina cobrando igual.
  private ofrecerVerificarCorreo(): void {
    const c = this.clienteSeleccionado!;
    Swal.fire({
      icon: 'question',
      title: '⚠️ Correo sin verificar',
      html: `
        <p style="font-size:0.9rem;margin-bottom:6px">
          El correo de <strong>${escaparHtml(c.nombrePersona)} ${escaparHtml(c.apeidoPaterno)}</strong> no está verificado:
        </p>
        <p style="font-size:0.9rem;margin:0"><strong>${escaparHtml(c.correoElectronico)}</strong></p>
        <p style="font-size:0.8rem;color:#64748b;margin-top:10px">
          Verificarlo permite enviarle el ticket y que participe en las rifas.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: '✉️ Verificar ahora',
      cancelButtonText: 'No, solo cobrar',
      reverseButtons: true
    }).then(result => {
      if (result.isDismissed && result.dismiss !== Swal.DismissReason.cancel) return;   // clic fuera / Esc / ✕: no se cobra (revisión 2026-11-09)
      if (!result.isConfirmed) {
        this.ejecutarVenta(this.clienteResolvedId); // el admin decidió no verificar
        return;
      }
      // Enviar el código. Si el envío falla igual mostramos el input: puede que el
      // cliente ya tuviera un código vigente de un intento anterior.
      this.clienteService.enviarCodigoVerificacion(c.id).subscribe({
        next:  () => this.pedirCodigoYCobrar(),
        error: () => this.pedirCodigoYCobrar()
      });
    });
  }

  private pedirCodigoYCobrar(): void {
    const c = this.clienteSeleccionado!;
    Swal.fire({
      title: 'Verificar correo',
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${escaparHtml(c.correoElectronico)}</strong>.<br>
          Pídele al cliente que te dicte el código de 6 dígitos.
        </p>
        <input id="swal-codigo-venta" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar y cobrar',
      showCancelButton: true,
      cancelButtonText: 'Omitir y cobrar',
      reverseButtons: true,
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-venta') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(c.id, codigo).toPromise();
          return true;
        } catch (err: any) {
          const raw = err?.error;
          const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (result.isDismissed && result.dismiss !== Swal.DismissReason.cancel) return;   // clic fuera / Esc: no se cobra; se vuelve a pulsar «Cobrar»
      if (result.isConfirmed) {
        c.correoVerificado = true;   // refresca el badge del chip sin recargar
      }
      // Se cobra tanto si verificó como si omitió — la venta nunca se bloquea.
      this.ejecutarVenta(this.clienteResolvedId);
    });
  }

  private ejecutarVentaConAdmin(): void {
    // Mientras se busca el perfil del administrador «Cobrar» queda deshabilitado (antes un segundo clic abría otra ventana y podía cobrar dos veces).
    this.procesando = true;
    this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
      next: (res: any) => {
        this.procesando = false;
        if (res) {
          this.clienteResolvedId = res as number;
          this.ejecutarVenta(this.clienteResolvedId, true);
        } else {
          Swal.fire({ icon: 'warning', title: 'Sin perfil de cliente', text: 'El administrador no tiene un perfil de cliente registrado.' });
        }
      },
      error: () => { this.procesando = false; Swal.fire({ icon: 'error', title: 'Error al obtener el cliente.' }); }
    });
  }

  /**
   * Los renglones del ticket impreso DESPUÉS de guardar: los que cobró el back (precio normal y precio cobrado), para que el ticket diga lo que de verdad
   * se cobró aunque la pantalla pensara otra cosa. Si el back no los manda, el snapshot de la pantalla.
   */
  private articulosDelTicket(res: IVentaDirectaResponse, respaldo: ITicketArticulo[]): ITicketArticulo[] {
    if (!res.renglones?.length) return respaldo;
    return res.renglones.map(r => {
      const hay = !!(r.conDescuentoDeCampana || r.conDescuentoDeGrupo) && r.precioNormal > r.precioCobrado + 0.005;
      return {
        cantidad: r.cantidad, productoNombre: r.nombre, talla: null, subTotal: +(r.precioCobrado * r.cantidad).toFixed(2),
        subTotalNormal: hay ? +(r.precioNormal * r.cantidad).toFixed(2) : null,
        etiqueta: hay ? (r.conDescuentoDeCampana ? 'Precio de campaña' : 'Precio por cantidad') : null
      } as ITicketArticulo;
    });
  }

  /** El total del ticket: la suma de lo que cobró el back (renglones) para que el ticket cuadre con el cobro; sin renglones, el de la pantalla. */
  private totalDelTicket(res: IVentaDirectaResponse, respaldo: number): number {
    if (!res.renglones?.length) return respaldo;
    return +res.renglones.reduce((s, r) => s + r.precioCobrado * r.cantidad, 0).toFixed(2);
  }

  private async ejecutarVenta(clienteId: number, sinDatosCliente = false): Promise<void> {
    // Doble clic / dos caminos a la vez: una sola venta en curso (antes `procesando` se encendía hasta DESPUÉS de la pregunta de entrega).
    if (this.procesando) return;
    this.procesando = true;
    // Sin datos del cliente: precios, ticket y request sin campaña (precio normal). Se recalcula ANTES del snapshot para que el ticket salga normal.
    const totalAntes = this.totalVenta;
    this.cobroSinDatos = sinDatosCliente;
    this.recalcularSubtotales();
    if (sinDatosCliente && Math.abs(this.totalVenta - totalAntes) > 0.005) {
      // La pantalla traía precio de campaña (casilla «Cliente recurrente» marcada): se avisa del total nuevo antes de cobrar.
      const r = await Swal.fire({
        icon: 'info', title: 'Se cobra a precio normal',
        text: `Sin datos del cliente no se aplica el precio de campaña. Total a cobrar: $${this.totalVenta.toFixed(2)} (antes $${totalAntes.toFixed(2)}).`,
        showCancelButton: true, confirmButtonText: 'Cobrar', cancelButtonText: 'Volver', reverseButtons: true, allowOutsideClick: false
      });
      if (!r.isConfirmed) {
        this.cobroSinDatos = false;
        this.recalcularSubtotales();
        this.procesando = false;
        return;
      }
    }
    // La campaña se vuelve a revisar con la fecha local: una pestaña abierta desde ayer no manda campaña si ya terminó.
    this.revisarVigenciaLocal();
    // "¿Ya se lo llevó?" (dominio entrega, 2026-10-06): contado e Ir pagando casi siempre sí; un
    // Apartado nunca (se lleva al pagarlo completo). Si dice que no, queda "Falta entregar".
    const entregado = this.tipoPedido === 'APARTADO' ? undefined
      : await preguntarSiSeLoLlevo('Si todavía no, queda como "Falta entregar" y lo marcas en Mis pedidos con 📦 Entregar.');
    this.procesando = true;

    // ── Snapshot de artículos y datos de ticket ANTES del POST ────────
    // (limpiarTodo() borra this.lineas; necesitamos los datos para imprimir)
    const articulosSnap = this.lineas.map(l => ({
      cantidad:       l.cantidad,
      productoNombre: l.variante.marca
        ? `${l.variante.marca}${l.variante.talla ? ' ' + l.variante.talla : ''}`
        : (l.variante.color ?? `Artículo #${l.variante.id}`),
      talla:    null as string | null,
      subTotal: l.subTotal,
      // Con descuento de campaña o de grupo: el precio normal tachado y la etiqueta (la pantalla replica lo que decide el back).
      subTotalNormal: this.conPrecioDeCampana(l) || this.conPrecioDeGrupo(l) ? (l.variante.precio ?? 0) * l.cantidad : null,
      etiqueta: this.conPrecioDeCampana(l) ? 'Precio de campaña' : this.conPrecioDeGrupo(l) ? 'Precio por cantidad' : null
    })) as ITicketArticulo[];
    const totalSnap           = this.totalVenta;
    const clienteSnap         = this.nombreClienteTicket;
    const metodoPagoSnap      = this.tipoPagoActivo?.formaPago ?? 'EFECTIVO';
    const montoDadoSnap       = this.esEfectivoContado && this.montoDadoContado > 0 ? this.montoDadoContado : null;
    const cambioSnap          = this.esEfectivoContado ? this.cambioContado : null;
    const correoDisponibleSnap = this.correoDisponible;
    const esCreditoSnap        = this.esCredito;
    // Ticket por correo (regla 2026-11-10): se decide aquí pero se manda DESPUÉS de la venta, con lo que cobró el back. Un correo del cliente
    // registrado que no está verificado no se usa (antes lo rechazaba el back al mandarlo junto con la venta).
    const correoTicketSnap: string | null = !this.esCredito && this.enviarCorreo && this.correoDisponible
      && this.clienteSeleccionado?.correoVerificado !== false
      ? (this.clienteSeleccionado?.correoElectronico || this.clienteSinRegistroModal?.correo_Electronico || null) : null;
    const correoSinVerificarSnap = !this.esCredito && this.enviarCorreo && this.clienteSeleccionado?.correoVerificado === false;

    const detallesVariantes = this.lineas.map(l => ({
      productoId:  l.variante.productoId ?? 0,
      varianteId:  l.variante.id,
      cantidad:    l.cantidad,
      precioVenta: this.precioUnitarioDe(l),
      subTotal:    l.subTotal
    }));

    const detallesPromos = this.promosCarrito.flatMap(p =>
      p.detalles.map(d => ({
        productoId:  0,
        varianteId:  d.varianteId,
        cantidad:    d.cantidad * p.cantidadCombos,
        precioVenta: d.precioEnPromocion,
        subTotal:    d.precioEnPromocion * d.cantidad * p.cantidadCombos,
        promocionId: p.promocionId
      }))
    );

    const request: IVentaDirectaRequest = {
      usuarioId:     this.idUsuario,
      clienteId,
      // El registro ya se creó (y opcionalmente verificó) en el back al llenar el
      // modal — se manda el id, nunca el DTO embebido (ver crearClienteSinRegistro()).
      clienteSinRegistroId: this.clienteSinRegistroId ?? undefined,
      detalles: [...detallesVariantes, ...detallesPromos],
      // Datos de entrega — opcionales, aplican a cualquier tipo de venta (no solo crédito).
      observaciones:     this.observaciones || undefined,
      nombreReceptor:    this.nombreReceptor || undefined,
      direccionEntrega:  this.direccionEntrega || undefined,
      fechaEntrega:      this.fechaEntrega || undefined,
      lugarEntregaId:    this.lugarEntregaId ?? undefined,
      urlFacebook:       this.urlFacebook || undefined,
      entregado,
      // Campaña vigente: el back decide el precio; solo se manda lo que el administrador puso.
      campana: this.campana && !sinDatosCliente
        ? { codigo: this.campanaCodigo.trim() || undefined, recurrenteManual: this.campanaRecurrente,
            aceptaPrivacidad: this.campanaPrivacidad && this.clienteTieneContacto }
        : undefined
    };

    if (this.esCredito) {
      if (this.tipoPedido === 'APARTADO' && this.montoInicial > 0) this.tipoPedido = 'FIADO';
      request.tipoPedido    = this.tipoPedido as 'APARTADO' | 'FIADO';
    } else {
      request.pagosYMesesId = this.pagosYMesesId!;
      if (montoDadoSnap !== null) request.montoDado = montoDadoSnap;
      // El ticket por correo YA NO va en este request (antes se armaba aquí con los precios de la pantalla): se manda al responder el back,
      // con sus renglones, total y cambio reales (ver enviarTicketPorCorreo).
    }

    this.varianteService.saveVentaDirecta(request).subscribe({
      next: (res: IVentaDirectaResponse) => {
        if (res.cobroConModuloNuevo && res.pedidoId) {
          // Tarjeta con el módulo nuevo: el pedido quedó Pendiente y la terminal lo cobra con <app-cobro-tarjeta>.
          this.procesando = false;
          this.varianteService.invalidarCache();
          this.cobroTerminalCorreo = correoTicketSnap;
          this.abrirCobroTerminal(res.pedidoId, res.totalVenta, () => generarHtmlTicket({
            tipo: 'venta', numero: res.pedidoId!, cliente: clienteSnap, articulos: this.articulosDelTicket(res, articulosSnap), total: this.totalDelTicket(res, totalSnap),
            metodoPago: metodoPagoSnap, montoDado: null, cambio: null,
            qrTienda: this.qrTienda, qrWhatsapp: this.qrWhatsapp, qrFacebook: this.qrFacebook,
            qrInstagram: this.qrInstagram, qrTiktok: this.qrTiktok
          }));
          return;
        }

        // Crédito (APARTADO / FIADO). Se decide por lo que se pidió (no solo por traer pedidoId): así una venta de contado que devuelva su pedidoId
        // (lo necesita el correo del ticket) no se toma por crédito.
        if (res.pedidoId && esCreditoSnap) {
          this.varianteService.invalidarCache();
          const pedidoId   = res.pedidoId;
          const label      = this.tipoPedido === 'APARTADO' ? 'Apartado' : 'Ir pagando';
          const monto      = this.montoInicial;
          const metodoPago = this.metodoPagoCredito;

          this.limpiarTodo();

          const mostrarSwalCredito = () => {
            this.procesando = false;
            const textoMonto = monto > 0 ? ` Enganche de $${monto.toFixed(2)} registrado.` : '';
            Swal.fire({
              icon: 'success',
              title: `✅ ${label} registrado`,
              text: `Pedido #${pedidoId} creado.${textoMonto} Registra los abonos en Créditos / Abonos.`,
              showCancelButton: true,
              confirmButtonText: '💳 Ir a Créditos / Abonos',
              cancelButtonText: 'Cerrar',}).then(result => {
              if (result.isConfirmed) this.router.navigate(['/abonos']);
            });
          };

          if (monto > 0) {
            const abonoBody: AbonoRequest = {
              monto,
              metodoPago,
              usuarioId: this.idUsuario,
              fechaPago: hoyIso()
            };
            this.abonoService.registrarAbono(pedidoId, abonoBody).subscribe({
              next:  () => mostrarSwalCredito(),
              error: (err) => {
                this.procesando = false;
                Swal.fire({
                  icon: 'warning',
                  title: `${label} registrado`,
                  text: `Pedido #${pedidoId} creado, pero no se pudo registrar el enganche: ${err?.error?.mensaje ?? 'Error al registrar abono.'}. Regístralo manualmente en Créditos / Abonos.`
                });
              }
            });
          } else {
            mostrarSwalCredito();
          }
          return;
        }

        this.procesando = false;

        if (!res.requiereTerminal) {
          // Efectivo / Transferencia → venta confirmada
          this.varianteService.invalidarCache();

          // Ticket con ventaId real (para imprimir). Total y cambio con lo que cobró el back (si difiere de la pantalla, manda el back).
          const totalTicket = this.totalDelTicket(res, totalSnap);
          const htmlTicket = generarHtmlTicket({
            tipo:      'venta',
            numero:    res.ventaId ?? 0,
            cliente:   clienteSnap,
            articulos: this.articulosDelTicket(res, articulosSnap),
            total:     totalTicket,
            metodoPago: metodoPagoSnap,
            montoDado:  montoDadoSnap,
            cambio:     cambioSnap !== null && montoDadoSnap !== null ? Math.max(0, +(montoDadoSnap - totalTicket).toFixed(2)) : cambioSnap,
            qrTienda:   this.qrTienda,
            qrWhatsapp: this.qrWhatsapp,
            qrFacebook: this.qrFacebook,
            qrInstagram: this.qrInstagram,
            qrTiktok:  this.qrTiktok
          });

          this.limpiarTodo();

          // El correo sale ya con el ticket real (una sola vez por venta). Si falla, la venta ya quedó: solo se avisa.
          const envioCorreo = this.enviarTicketPorCorreo(res.pedidoId, correoTicketSnap, htmlTicket);

          Swal.fire({
            icon:               'success',
            title:              `¡Venta #${res.ventaId} registrada!`,
            text:               [res.descripcionPago,
                                 Math.abs(totalTicket - totalSnap) > 0.005 ? `Total cobrado: $${totalTicket.toFixed(2)} (la pantalla decía $${totalSnap.toFixed(2)}).` : null,
                                 correoTicketSnap ? `El ticket se está enviando a ${correoTicketSnap}.` : null,
                                 correoSinVerificarSnap ? 'El ticket no se mandó por correo: el correo del cliente no está verificado.' : null]
                                  .filter(Boolean).join(' ') || undefined,
            showConfirmButton:  true,
            confirmButtonText:  '🖨️ Imprimir ticket',
            showCancelButton:   true,
            cancelButtonText:   'Cerrar'
          }).then(async result => {
            if (result.isConfirmed) imprimirTicket(htmlTicket);
            const errorCorreo = await envioCorreo;
            if (errorCorreo) {
              Swal.fire({ icon: 'warning', title: 'La venta quedó registrada', text: errorCorreo });
              return;
            }
            // Sin correo registrado → preguntar si quiere recibir el ticket por correo
            if (!correoDisponibleSnap && res.pedidoId) {
              this.pedirCorreoPostTransaccion(res.pedidoId, htmlTicket);
            }
          });
        } else {
          // Tarjeta → mostrar panel de terminal
          this.ventaCreada     = res;
          this.mostrarTerminal = true;
          this.estadoTerminal  = 'idle';
        }
      },
      error: (err) => {
        this.procesando = false;
        // La venta no se hizo: la pantalla vuelve a mostrar los precios que tocan al cliente (la casilla sigue como estaba).
        if (this.cobroSinDatos) { this.cobroSinDatos = false; this.recalcularSubtotales(); }
        const msg: string = (err?.error?.mensaje ?? err?.error?.message) ?? '';
        if (msg.toLowerCase().includes('no es valido') || msg.toLowerCase().includes('no es válido')) {
          Swal.fire({
            icon: 'warning',
            title: 'Precio desactualizado',
            html: `<p>${escaparHtml(msg)}</p><p>El precio de uno o más artículos cambió. <strong>Actualiza el catálogo y vuelve a intentarlo.</strong></p>`,
            confirmButtonText: '🔄 Ir al catálogo',
            showCancelButton: true,
            cancelButtonText: 'Cerrar'
          }).then(r => { if (r.isConfirmed) this.router.navigate(['/tienda/buscar']); });
        } else {
          Swal.fire({ icon: 'error', title: 'Error al procesar la venta', text: msg || 'No se pudo procesar la venta.' });
        }
      }
    });
  }

  /**
   * Manda el ticket por correo DESPUÉS de la venta (regla 2026-11-10), con el HTML armado con los renglones/total/cambio que devolvió el back. Usa el mismo
   * envío de comprobantes que Mis pedidos (reenviarComprobante → htmlTicketParaCorreo). Se llama una sola vez por venta y nunca toca la venta:
   * resuelve con el mensaje de error para mostrarlo (o null si salió bien / no había nada que mandar).
   */
  private enviarTicketPorCorreo(pedidoId: number | null, correo: string | null, htmlTicket: string): Promise<string | null> {
    if (!correo) return Promise.resolve(null);
    if (!pedidoId) {
      return Promise.resolve('El ticket no se pudo enviar por correo (falta el número de pedido de la venta). Reenvíalo desde Mis pedidos.');
    }
    return new Promise(resolve => {
      this.pedidosService.reenviarComprobante(pedidoId, { correo, ticketHtml: htmlTicket }).subscribe({
        next: () => resolve(null),
        error: err => resolve(`El ticket no se pudo enviar por correo: ${err?.error?.mensaje ?? 'error al enviar'}. Reenvíalo desde Mis pedidos.`)
      });
    });
  }

  private pedirCorreoPostTransaccion(pedidoId: number, htmlTicket: string): void {
    Swal.fire({
      title: '📧 ¿Enviar ticket por correo?',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'No, gracias',
      reverseButtons: true,
      inputValidator: v => (v && !v.includes('@')) ? 'Ingresa un correo válido' : null
    }).then(res => {
      if (!res.isConfirmed || !res.value) return;
      this.pedidosService.reenviarComprobante(pedidoId, { correo: res.value, ticketHtml: htmlTicket }).subscribe({
        next: (r: any) => Swal.fire({ title: '✅ Enviado', text: r?.data ?? `Ticket enviado a ${res.value}`, icon: 'success', timer: 2000, showConfirmButton: false }),
        error: err => Swal.fire({ title: 'Error al enviar', text: err?.error?.mensaje ?? 'No se pudo enviar el correo.', icon: 'error' })
      });
    });
  }

  // ── Cobro con la terminal del módulo nuevo (<app-cobro-tarjeta canal="TERMINAL">) ──
  cobroTerminalVisible = false;
  cobroTerminalPedidoId: number | null = null;
  cobroTerminalTotal = 0;
  private cobroTerminalAprobado = false;
  private cobroTerminalTicket: (() => string) | null = null;
  /** A quién mandar el ticket por correo cuando la terminal apruebe el cobro (null = no se manda). Se usa una sola vez. */
  private cobroTerminalCorreo: string | null = null;

  private abrirCobroTerminal(pedidoId: number, total: number, ticket: () => string): void {
    this.cobroTerminalPedidoId = pedidoId;
    this.cobroTerminalTotal = total;
    this.cobroTerminalTicket = ticket;
    this.cobroTerminalAprobado = false;
    this.cobroTerminalVisible = true;
  }

  alAprobarseCobroTerminal(): void {
    this.cobroTerminalAprobado = true;
  }

  /** Aprobado: ticket y a limpiar. Si no: el pedido sigue Pendiente (sin Venta) y se decide qué hacer con él. */
  alCerrarCobroTerminal(): void {
    // El diálogo avisa dos veces al cerrarse (visibleChange y onHide): la segunda no hace nada.
    if (!this.cobroTerminalVisible) return;
    this.cobroTerminalVisible = false;
    const pedidoId = this.cobroTerminalPedidoId;
    if (!pedidoId) return;
    if (this.cobroTerminalAprobado) {
      const html = this.cobroTerminalTicket?.() ?? '';
      const correo = this.cobroTerminalCorreo;
      this.cobroTerminalCorreo = null;     // una sola vez aunque el diálogo avise dos veces
      this.varianteService.invalidarCache();
      this.limpiarTodo();
      const envioCorreo = this.enviarTicketPorCorreo(pedidoId, html ? correo : null, html);
      Swal.fire({
        icon: 'success', title: `¡Pago aprobado! Pedido #${pedidoId}`,
        text: ['Quedó pagado y entregado.', correo && html ? `El ticket se está enviando a ${correo}.` : null].filter(Boolean).join(' '),
        showConfirmButton: true, confirmButtonText: '🖨️ Imprimir ticket', showCancelButton: true, cancelButtonText: 'Cerrar'
      }).then(async r => {
        if (r.isConfirmed && html) imprimirTicket(html);
        const errorCorreo = await envioCorreo;
        if (errorCorreo) Swal.fire({ icon: 'warning', title: 'El pago quedó registrado', text: errorCorreo });
      });
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: `El pedido #${pedidoId} quedó sin cobrar`,
      text: 'La tarjeta no se cobró. Puedes volver a intentarlo, cancelar la venta (el stock regresa) o dejarla pendiente para cobrarla en efectivo desde Mis pedidos.',
      showDenyButton: true, showCancelButton: true,
      confirmButtonText: '💳 Intentar de nuevo', denyButtonText: 'Cancelar la venta', cancelButtonText: 'Dejarla pendiente',
      allowOutsideClick: false
    }).then(r => {
      if (r.isConfirmed) {
        this.cobroTerminalVisible = true;
      } else if (r.isDenied) {
        this.cobroTerminalCorreo = null;
        this.pedidosService.cancelarConMotivo(pedidoId, 'Venta con tarjeta no cobrada').subscribe({
          next: () => {
            this.varianteService.invalidarCache();
            Swal.fire({ icon: 'info', title: 'Venta cancelada', text: 'El stock regresó. Puedes volver a armar la venta.', timer: 2200, showConfirmButton: false });
          },
          error: err => Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: err?.error?.mensaje ?? 'Cancélala desde Mis pedidos.' })
        });
      } else {
        this.cobroTerminalCorreo = null;
        this.limpiarTodo();
        this.router.navigate(['/pedidos/mis-pedidos']);
      }
    });
  }

  // ── Terminal Mercado Pago ──────────────────────────────────────────

  enviarATerminal(): void {
    if (!this.ventaCreada) return;
    this.estadoTerminal = 'procesando';

    const request: ITerminalIniciarRequest = {
      pedidoId:      this.ventaCreada.ventaId!,
      clienteId:     this.clienteSeleccionado?.id ?? this.clienteResolvedId,
      pagosYMesesId: this.pagosYMesesId!,
      cuotas:        this.mesesSeleccionado?.cuotas ?? 1,
      totalMonto:    this.ventaCreada.totalVenta,
      descripcion:   `Venta directa #${this.ventaCreada.ventaId}`
    };

    this.pagoService.iniciarPagoTerminal(request).subscribe({
      next: res => { this.intentId = res.intentId; this.startPolling(res.intentId); },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.mensaje ?? err.error?.message ?? 'Error al conectar con la terminal.';
        this.errorTerminal  = msg;
        this.estadoTerminal = err.status === 429 ? 'bloqueado' : 'rechazado';
      }
    });
  }

  cancelarTerminal(): void {
    this.stopPolling();
    if (this.intentId) this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    this.estadoTerminal = 'cancelado';
    this.intentId = null;
  }

  cerrarTerminal(): void {
    this.stopPolling();
    this.mostrarTerminal = false;
    this.ventaCreada     = null;
    this.estadoTerminal  = 'idle';
  }

  private startPolling(intentId: string): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.pagoService.getEstadoTerminal(intentId).subscribe({
        next: res => {
          if (res.estado === 'FINISHED') {
            this.stopPolling();
            this.estadoTerminal = 'aprobado';
            this.varianteService.invalidarCache();
            const vId = this.ventaCreada?.ventaId;
            setTimeout(() => {
              Swal.fire({ icon: 'success', title: `¡Pago aprobado! Venta #${vId}`, timer: 2000, showConfirmButton: false });
              this.limpiarTodo();
            }, 800);
          } else if (res.estado === 'CANCELED') {
            this.stopPolling();
            this.estadoTerminal = 'cancelado';
          }
        },
        error: () => { this.stopPolling(); this.estadoTerminal = 'rechazado'; }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
  }
}
