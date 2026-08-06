import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { IVarianteResumen } from '../models/variante.model';
import { VarianteService, IVentaDirectaRequest, IVentaDirectaResponse, IClienteSinRegistro } from '../service/variante.service';
import { CarritoVarianteService } from '../service/carrito-variante.service';
import { IItemPromoCarrito } from 'src/app/promociones/models/promocion.model';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AbonoRequest, MetodoPago } from 'src/app/abonos/models/abono.model';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { generarHtmlTicket, imprimirTicket, ITicketData } from 'src/app/shared/ticket.util';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { PedidosService } from 'src/app/pedidos/pedidos.service';
import { LugarEntregaService } from 'src/app/lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from 'src/app/lugares-entrega/models/lugar-entrega.model';

interface ILineaVenta {
  variante: IVarianteResumen;
  cantidad:  number;
  subTotal:  number;
}

@Component({
  selector: 'app-venta-directa',
  templateUrl: './venta-directa.component.html',
  styleUrls: ['./venta-directa.component.scss']
})
export class VentaDirectaComponent implements OnInit, OnDestroy {

  modalClienteSinRegistro = false;
  private cobrarPendiente = false;
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
    private fb: FormBuilder
  ) {

    this.clienteForm = this.fb.group({
      nombre_persona: ['', Validators.required],
      segundo_nombre: [''],
      apeido_Paterno: [''],
      apeido_Materno: [''],
      fecha_Nacimiento: [''],
      sexo: [''],
      correo_Electronico: [''],
      numero_Telefonico: ['']
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

  // Paso 1: crea el registro en el back (antes solo se guardaba en memoria).
  // Si trae correo sin verificar, pasa al paso de verificación dentro del mismo
  // modal; si no hay correo, cierra directo (nada que verificar).
  guardarClienteSinRegistro(): void {
    if (this.clienteForm.invalid || this.guardandoClienteSinRegistro) return;
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
        this.actualizarCheckboxesTicket();

        if (dto.correo_Electronico && !res.correoVerificado) {
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
  }
  ngOnInit(): void {
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
      next: c => { this.qrWhatsapp = c.whatsappUrl; this.qrFacebook = c.facebookUrl; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
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
  }

  seleccionarMeses(opcion: IOpcionMesesDto): void {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId     = opcion.pagosYMesesId;
  }

  seleccionarCredito(tipo: 'APARTADO' | 'FIADO'): void {
    if (this.tipoPedido === tipo) {
      this.tipoPedido        = 'NORMAL';
      this.metodoPagoCredito = 'EFECTIVO';
      this.montoInicial      = 0;
      return;
    }
    this.tipoPedido        = tipo;
    this.tipoPagoActivo    = null;
    this.mesesSeleccionado = null;
    this.pagosYMesesId     = null;
    this.metodoPagoCredito = 'EFECTIVO';
    this.montoInicial      = 0;
  }

  // ── Búsqueda de variantes ──────────────────────────────────────────

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
      this.lineas[idx].subTotal = this.lineas[idx].cantidad * (this.lineas[idx].variante.precio ?? 0);
    } else {
      if ((v.stock ?? 0) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Producto sin stock', timer: 1400, showConfirmButton: false });
        return;
      }
      this.lineas.push({ variante: v, cantidad: 1, subTotal: v.precio ?? 0 });
    }
  }

  incrementar(linea: ILineaVenta): void {
    if (linea.cantidad >= (linea.variante.stock ?? 0)) return;
    linea.cantidad++;
    linea.subTotal = linea.cantidad * (linea.variante.precio ?? 0);
  }

  decrementar(linea: ILineaVenta): void {
    if (linea.cantidad <= 1) { this.quitarLinea(this.lineas.indexOf(linea)); return; }
    linea.cantidad--;
    linea.subTotal = linea.cantidad * (linea.variante.precio ?? 0);
  }

  quitarLinea(i: number): void { this.lineas.splice(i, 1); }

  // Solo quita el combo de ESTA venta en curso, igual que quitarLinea(). El carrito
  // real se limpia hasta el final, en limpiarTodo(), si la venta vino de ahí.
  quitarPromo(i: number): void { this.promosCarrito.splice(i, 1); }

  limpiarVenta(): void {
    Swal.fire({
      title: '¿Limpiar la venta?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#d33'
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
    return tieneItems && tieneFormaPago && !this.procesando;
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
    return [v.talla, v.color, v.marca].filter(Boolean).join(' · ') || `Variante #${v.id}`;
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
    this.actualizarCheckboxesTicket();
  }

  limpiarCliente(): void {
    this.clienteSeleccionado = null;
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
      if (this.clienteSeleccionado.correoVerificado === false && this.clienteSeleccionado.correoElectronico) {
        this.ofrecerVerificarCorreo();
        return;
      }
      this.ejecutarVenta(this.clienteResolvedId);
    } else {
      // Sin cliente → preguntar si quiere agregar uno para la rifa
      Swal.fire({
        icon: 'question',
        title: '¿Agregar cliente para la rifa?',
        text: 'No hay cliente seleccionado. ¿Desea registrar uno antes de cobrar?',
        showCancelButton: true,
        confirmButtonText: 'Sí, agregar cliente',
        cancelButtonText: 'No, cobrar sin cliente',
        reverseButtons: true
      }).then(result => {
        if (result.isConfirmed) {
          this.cobrarPendiente = true;
          this.openModalSinRegistro();
        } else {
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
          El correo de <strong>${c.nombrePersona} ${c.apeidoPaterno ?? ''}</strong> no está verificado:
        </p>
        <p style="font-size:0.9rem;margin:0"><strong>${c.correoElectronico}</strong></p>
        <p style="font-size:0.8rem;color:#64748b;margin-top:10px">
          Verificarlo permite enviarle el ticket y que participe en las rifas.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: '✉️ Verificar ahora',
      cancelButtonText: 'No, solo cobrar',
      reverseButtons: true
    }).then(result => {
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
          Se envió un código a <strong>${c.correoElectronico}</strong>.<br>
          Pídele al cliente que te dicte el código de 6 dígitos.
        </p>
        <input id="swal-codigo-venta" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #00875A;border-radius:8px;
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
      if (result.isConfirmed) {
        c.correoVerificado = true;   // refresca el badge del chip sin recargar
      }
      // Se cobra tanto si verificó como si omitió — la venta nunca se bloquea.
      this.ejecutarVenta(this.clienteResolvedId);
    });
  }

  private ejecutarVentaConAdmin(): void {
    this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
      next: (res: any) => {
        if (res) {
          this.clienteResolvedId = res as number;
          this.ejecutarVenta(this.clienteResolvedId);
        } else {
          Swal.fire({ icon: 'warning', title: 'Sin perfil de cliente', text: 'El administrador no tiene un perfil de cliente registrado.' });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error al obtener el cliente.' })
    });
  }

  private ejecutarVenta(clienteId: number): void {
    this.procesando = true;

    // ── Snapshot de artículos y datos de ticket ANTES del POST ────────
    // (limpiarTodo() borra this.lineas; necesitamos los datos para imprimir)
    const articulosSnap = this.lineas.map(l => ({
      cantidad:       l.cantidad,
      productoNombre: l.variante.marca
        ? `${l.variante.marca}${l.variante.talla ? ' ' + l.variante.talla : ''}`
        : (l.variante.color ?? `Variante #${l.variante.id}`),
      talla:    null as string | null,
      subTotal: l.subTotal
    }));
    const totalSnap           = this.totalVenta;
    const clienteSnap         = this.nombreClienteTicket;
    const metodoPagoSnap      = this.tipoPagoActivo?.formaPago ?? 'EFECTIVO';
    const montoDadoSnap       = this.esEfectivoContado && this.montoDadoContado > 0 ? this.montoDadoContado : null;
    const cambioSnap          = this.esEfectivoContado ? this.cambioContado : null;
    const correoDisponibleSnap = this.correoDisponible;

    const detallesVariantes = this.lineas.map(l => ({
      productoId:  l.variante.productoId ?? 0,
      varianteId:  l.variante.id,
      cantidad:    l.cantidad,
      precioVenta: l.variante.precio ?? 0,
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
      urlFacebook:       this.urlFacebook || undefined
    };

    // Promos son solo de contado — bloquear crédito aunque el admin lo haya seleccionado
    if (this.esCredito && !this.tienePromos) {
      request.tipoPedido    = this.tipoPedido as 'APARTADO' | 'FIADO';
    } else {
      request.pagosYMesesId = this.pagosYMesesId!;
      if (montoDadoSnap !== null) request.montoDado = montoDadoSnap;
      if (this.enviarCorreo && this.correoDisponible) {
        const preTicket: ITicketData = {
          tipo: 'venta', numero: 0, cliente: clienteSnap,
          articulos: articulosSnap, total: totalSnap,
          metodoPago: metodoPagoSnap, montoDado: montoDadoSnap, cambio: cambioSnap,
          qrTienda:   this.qrTienda,
          qrWhatsapp: this.qrWhatsapp,
          qrFacebook: this.qrFacebook
        };
        request.notificacion = {
          enviarCorreo: true,
          ticketHtml:   generarHtmlTicket(preTicket)
        };
      }
    }

    this.varianteService.saveVentaDirecta(request).subscribe({
      next: (res: IVentaDirectaResponse) => {
        if (res.pedidoId) {
          // Crédito (APARTADO / FIADO)
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
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#4f46e5'
            }).then(result => {
              if (result.isConfirmed) this.router.navigate(['/abonos']);
            });
          };

          if (monto > 0) {
            const abonoBody: AbonoRequest = {
              monto,
              metodoPago,
              usuarioId: this.idUsuario,
              fechaPago: new Date().toISOString().slice(0, 10)
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

          // Ticket con ventaId real (para imprimir)
          const htmlTicket = generarHtmlTicket({
            tipo:      'venta',
            numero:    res.ventaId ?? 0,
            cliente:   clienteSnap,
            articulos: articulosSnap,
            total:     totalSnap,
            metodoPago: metodoPagoSnap,
            montoDado:  montoDadoSnap,
            cambio:     cambioSnap,
            qrTienda:   this.qrTienda,
            qrWhatsapp: this.qrWhatsapp,
            qrFacebook: this.qrFacebook
          });

          this.limpiarTodo();

          Swal.fire({
            icon:               'success',
            title:              `¡Venta #${res.ventaId} registrada!`,
            text:               res.descripcionPago ?? undefined,
            showConfirmButton:  true,
            confirmButtonText:  '🖨️ Imprimir ticket',
            showCancelButton:   true,
            cancelButtonText:   'Cerrar'
          }).then(result => {
            if (result.isConfirmed) imprimirTicket(htmlTicket);
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
        const msg: string = (err?.error?.mensaje ?? err?.error?.message) ?? '';
        if (msg.toLowerCase().includes('no es valido') || msg.toLowerCase().includes('no es válido')) {
          Swal.fire({
            icon: 'warning',
            title: 'Precio desactualizado',
            html: `<p>${msg}</p><p>El precio de uno o más productos cambió. <strong>Actualiza el catálogo y vuelve a intentarlo.</strong></p>`,
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
