import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../auth/auth.service';
import { IVarianteResumen } from '../variante/models/variante.model';
import { VarianteService } from '../variante/service/variante.service';
import {
  AbonoRequest, CancelarAbonoRequest, EstadoCuenta, MetodoPago,
  PedidoPagado, PedidoDetalleResponse, ReporteCancelado, TransferirAbonoRequest
} from './models/abono.model';
import { AbonoService } from './service/abono.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { generarHtmlTicket, imprimirTicket, ITicketData, ITicketArticulo } from '../shared/ticket.util';
import { NegocioService } from '../negocio/negocio.service';

type Tab = 'cuenta' | 'pagados' | 'cancelados';

@Component({
  selector: 'app-abonos',
  templateUrl: './abonos.component.html',
  styleUrls: ['./abonos.component.scss']
})
export class AbonosComponent implements OnInit, OnDestroy {

  tab: Tab = 'cuenta';

  // ── Estado de cuenta ──────────────────────────────────────────────
  estadoCuenta: EstadoCuenta[]  = [];
  cargandoCuenta                = false;

  // ── Pedidos pagados ───────────────────────────────────────────────
  pagados: PedidoPagado[]       = [];
  cargandoPagados               = false;

  // ── Cancelados ────────────────────────────────────────────────────
  cancelados: ReporteCancelado[] = [];
  cargandoCancelados             = false;

  // ── Modal abono ───────────────────────────────────────────────────
  modalAbierto                  = false;
  pedidoSeleccionado: EstadoCuenta | null = null;
  registrando                   = false;

  abonoForm: AbonoRequest = {
    monto:      0,
    fechaPago:  this.hoy(),
    metodoPago: 'EFECTIVO',
    nota:       ''
  };

  readonly metodos: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA'];
  montoDado = 0;
  get cambio(): number {
    return this.montoDado > 0 && this.montoDado > this.abonoForm.monto
      ? +(this.montoDado - this.abonoForm.monto).toFixed(2)
      : 0;
  }

  // ── Modal transferencia ───────────────────────────────────────────
  modalTransferenciaAbierto                 = false;
  pedidoCancelado: ReporteCancelado | null  = null;
  terminoTransferencia                      = '';
  resultadosTransferencia: IVarianteResumen[] = [];
  buscandoTransferencia                     = false;
  varianteElegida: IVarianteResumen | null  = null;
  precioEditable                            = 0;
  precioOriginal                            = 0;
  cantidadTransferir                        = 1;
  transfiriendo                             = false;
  private transferSub$ = new Subject<string>();

  // ── Detalle expandible ────────────────────────────────────────────
  expandidoId: number | null         = null;
  expandidoPagadoId: number | null   = null;
  expandidoCanceladoId: number | null = null;

  // ── Ticket ────────────────────────────────────────────────────────
  enviarCorreo     = false;
  correoDisponible = false;
  private detalleActual: PedidoDetalleResponse | null = null;
  // QR contactos del negocio
  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;

  // ── Usuario ───────────────────────────────────────────────────────
  idUsuario = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private readonly abonoService:    AbonoService,
    private readonly authService:     AuthService,
    private readonly varianteService: VarianteService,
    private readonly pedidosService:  PedidosService,
    private readonly negocioService:  NegocioService
  ) {}

  ngOnInit(): void {
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });
    this.cargarCuenta();

    this.transferSub$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(termino => {
      this.buscandoTransferencia = true;
      this.varianteService.buscar({ termino, pagina: 1, size: 20 }).subscribe({
        next: res => { this.resultadosTransferencia = res.t ?? []; this.buscandoTransferencia = false; },
        error: ()  => { this.buscandoTransferencia = false; }
      });
    });

    // Cargar URLs de contacto del negocio para QR en ticket (silencioso si falla)
    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl; this.qrFacebook = c.facebookUrl; },
      error: () => {}
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cambiarTab(t: Tab): void {
    this.tab = t;
    if (t === 'pagados'    && !this.pagados.length)    this.cargarPagados();
    if (t === 'cancelados' && !this.cancelados.length) this.cargarCancelados();
  }

  // ── Carga ─────────────────────────────────────────────────────────

  cargarCuenta(): void {
    this.cargandoCuenta = true;
    this.abonoService.reporteEstadoCuenta()
      .pipe(finalize(() => this.cargandoCuenta = false))
      .subscribe({
        next: res  => { this.estadoCuenta = res?.data ?? []; },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar el estado de cuenta.' });
        }
      });
  }

  cargarPagados(): void {
    this.cargandoPagados = true;
    this.abonoService.reportePagados()
      .pipe(finalize(() => this.cargandoPagados = false))
      .subscribe({
        next: res  => { this.pagados = res?.data ?? []; },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar los pedidos pagados.' });
        }
      });
  }

  cargarCancelados(): void {
    this.cargandoCancelados = true;
    this.abonoService.reporteCancelados()
      .pipe(finalize(() => this.cargandoCancelados = false))
      .subscribe({
        next: res  => { this.cancelados = res?.data ?? []; },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar los cancelados.' });
        }
      });
  }

  // ── Cancelar pedido ───────────────────────────────────────────────

  cancelarPedido(pedido: EstadoCuenta): void {
    const esFiado = pedido.tipoPedido === 'FIADO';
    const msgDetalle = esFiado
      ? `El producto ya fue entregado. La deuda de $${pedido.saldo.toFixed(2)} quedará registrada.`
      : `Pagó $${pedido.totalPagado.toFixed(2)} de $${pedido.totalPedido.toFixed(2)}. Se devolverá el stock.`;

    Swal.fire({
      title: `¿Cancelar el ${esFiado ? 'fiado' : 'apartado'} de ${pedido.cliente}?`,
      html:  `<p style="margin:0 0 12px">${msgDetalle}</p>
              <input id="swal-motivo" class="swal2-input" maxlength="30"
                     placeholder="Motivo de cancelación (opcional)">`,
      icon: 'warning',
      showCancelButton:    true,
      confirmButtonText:   esFiado ? 'Sí, registrar como incobrable' : 'Sí, cancelar y devolver stock',
      cancelButtonText:    'No',
      confirmButtonColor:  '#ef4444'
    }).then(result => {
      if (!result.isConfirmed) return;
      const motivo = (document.getElementById('swal-motivo') as HTMLInputElement)?.value?.trim() || undefined;
      this.abonoService.cancelar(pedido.pedidoId, { motivo }).subscribe({
        next: res => {
          const data     = res?.data;
          const stockMsg = data?.stockDevuelto ? ' El stock fue devuelto.' : '';
          this.cargarCuenta();
          this.cancelados = [];

          // Intentar obtener detalle para ticket D
          this.pedidosService.getDetallePedido(pedido.pedidoId).subscribe({
            next: detRes => {
              const det = detRes?.data;
              const htmlTicket = det ? generarHtmlTicket({
                tipo:      'cancelacion',
                numero:    pedido.pedidoId,
                cliente:   pedido.cliente,
                articulos: det.detalles.map(d => ({ cantidad: d.cantidad, productoNombre: d.productoNombre, talla: d.talla, subTotal: d.subTotal })),
                total:     pedido.totalPedido,
                metodoPago: 'N/A',
                motivo:    motivo ?? null,
                qrTienda:   this.qrTienda,
                qrWhatsapp: this.qrWhatsapp,
                qrFacebook: this.qrFacebook
              }) : null;

              Swal.fire({
                icon:               'success',
                title:              'Cancelado',
                html:               `<p style="margin:0">${(data?.mensaje ?? 'Pedido cancelado.') + stockMsg}</p>`,
                showConfirmButton:  !!htmlTicket,
                confirmButtonText:  '🖨️ Imprimir ticket',
                showCancelButton:   !!htmlTicket,
                cancelButtonText:   'Cerrar',
                timer:              htmlTicket ? undefined : 3500
              }).then(result => {
                if (result.isConfirmed && htmlTicket) imprimirTicket(htmlTicket);
              });
            },
            error: () => {
              Swal.fire({ icon: 'success', title: 'Cancelado', text: (data?.mensaje ?? 'Pedido cancelado.') + stockMsg, timer: 3500, showConfirmButton: false });
            }
          });
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cancelar el pedido.' });
        }
      });
    });
  }

  // ── Modal abono ───────────────────────────────────────────────────

  abrirModal(ec: EstadoCuenta): void {
    this.pedidoSeleccionado = ec;
    this.abonoForm = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
    this.montoDado = 0;
    this.detalleActual = null;
    // EstadoCuenta no expone email — correoDisponible en false hasta que el back lo incluya
    this.correoDisponible = false;
    this.enviarCorreo     = false;
    this.modalAbierto = true;
    // Pre-cargar artículos para ticket (silencioso si falla)
    this.pedidosService.getDetallePedido(ec.pedidoId).subscribe({
      next: res => { this.detalleActual = res?.data ?? null; },
      error: () => {}
    });
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.pedidoSeleccionado = null;
  }

  registrarAbono(): void {
    if (!this.pedidoSeleccionado || this.registrando) return;
    if (!this.abonoForm.monto || this.abonoForm.monto <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El monto debe ser mayor a 0.' });
      return;
    }

    this.registrando = true;
    const montoDadoEfectivo = this.abonoForm.metodoPago === 'EFECTIVO' && this.montoDado > 0 ? this.montoDado : undefined;

    const body: AbonoRequest = {
      monto:      this.abonoForm.monto,
      usuarioId:  this.idUsuario,
      fechaPago:  this.abonoForm.fechaPago  || undefined,
      metodoPago: this.abonoForm.metodoPago || undefined,
      nota:       this.abonoForm.nota       || undefined,
      montoDado:  montoDadoEfectivo
    };

    if (this.enviarCorreo && this.correoDisponible && this.detalleActual) {
      const tempTicket = this.buildTicketData(body, 'abono', this.pedidoSeleccionado);
      tempTicket.qrTienda   = this.qrTienda;
      tempTicket.qrWhatsapp = this.qrWhatsapp;
      tempTicket.qrFacebook = this.qrFacebook;
      body.notificacion = {
        enviarCorreo: true,
        ticketHtml:   generarHtmlTicket(tempTicket)
      };
    }

    // Capturar para el Swal de éxito (el modal se cierra antes)
    const pedidoSnap         = this.pedidoSeleccionado;
    const cambioSnap         = this.cambio;
    const detalleSnap        = this.detalleActual;
    const montoDadoSnap      = montoDadoEfectivo ?? 0;
    const metodoPagoSnap     = this.abonoForm.metodoPago ?? 'EFECTIVO';

    this.abonoService.registrarAbono(pedidoSnap.pedidoId, body)
      .pipe(finalize(() => this.registrando = false))
      .subscribe({
        next: res => {
          const data = res?.data;

          pedidoSnap.saldo       = data?.saldoRestante ?? +(pedidoSnap.saldo - body.monto).toFixed(2);
          pedidoSnap.totalPagado = +(pedidoSnap.totalPedido - pedidoSnap.saldo).toFixed(2);
          if (data) pedidoSnap.abonos.push(data);

          const esLiquidado = data?.estadoPedido === 'PAGADO' || pedidoSnap.saldo <= 0;
          const tipo: 'abono' | 'liquidado' = esLiquidado ? 'liquidado' : 'abono';
          this.cerrarModal();
          if (esLiquidado) this.cargarCuenta();

          // Construir ticket de impresión si tenemos los artículos
          const htmlTicket = detalleSnap
            ? generarHtmlTicket({ ...this.buildTicketDataFromDetalle(body, tipo, pedidoSnap, detalleSnap, montoDadoSnap, cambioSnap, metodoPagoSnap), qrTienda: this.qrTienda, qrWhatsapp: this.qrWhatsapp, qrFacebook: this.qrFacebook })
            : null;

          const txtCambio = cambioSnap > 0 ? ` Cambio al cliente: $${cambioSnap.toFixed(2)}.` : '';
          const titulo = esLiquidado ? '¡Pedido liquidado!' : 'Abono registrado';
          const texto  = esLiquidado
            ? `El pedido #${pedidoSnap.pedidoId} de ${pedidoSnap.cliente} ha sido liquidado.${txtCambio}`
            : `Saldo restante: $${pedidoSnap.saldo.toFixed(2)}.${txtCambio}`;

          // Envío de correo/WhatsApp — mostrar resultado si el back lo confirmó
          const lineasEnvio: string[] = [];
          if (data?.correoEnviado    === true)  lineasEnvio.push('✅ Correo enviado al cliente');
          if (data?.whatsappEnviado  === true)  lineasEnvio.push('✅ WhatsApp enviado al cliente');
          if (data?.erroresEnvio?.length)       lineasEnvio.push(...data.erroresEnvio.map(e => `⚠️ ${e}`));

          Swal.fire({
            icon:               'success',
            title:              titulo,
            html:               `<p style="margin:0 0 8px">${texto}</p>${lineasEnvio.map(l => `<p style="margin:0">${l}</p>`).join('')}`,
            showConfirmButton:  !!htmlTicket,
            confirmButtonText:  '🖨️ Imprimir ticket',
            showCancelButton:   !!htmlTicket,
            cancelButtonText:   'Cerrar',
            timer:              htmlTicket ? undefined : (esLiquidado ? 4000 : 2500)
          }).then(result => {
            if (result.isConfirmed && htmlTicket) imprimirTicket(htmlTicket);
            // Si el cliente no tiene correo registrado → preguntar si quiere recibir el ticket
            if (!this.correoDisponible && htmlTicket) {
              this.pedirCorreoPostTransaccion(pedidoSnap.pedidoId, htmlTicket);
            }
          });
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
        }
      });
  }

  pedirCorreoPostTransaccion(pedidoId: number, htmlTicket: string): void {
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

  private buildTicketData(
    body: AbonoRequest,
    tipo: 'abono' | 'liquidado',
    pedido: EstadoCuenta
  ): ITicketData {
    const det = this.detalleActual!;
    return this.buildTicketDataFromDetalle(
      body, tipo, pedido, det,
      body.montoDado ?? 0,
      body.montoDado ? +(body.montoDado - body.monto).toFixed(2) : 0,
      body.metodoPago ?? 'EFECTIVO'
    );
  }

  private buildTicketDataFromDetalle(
    body: AbonoRequest,
    tipo: 'abono' | 'liquidado',
    pedido: EstadoCuenta,
    detalle: PedidoDetalleResponse,
    montoDado: number,
    cambio: number,
    metodoPago: string
  ): ITicketData {
    return {
      tipo,
      numero:         pedido.pedidoId,
      cliente:        pedido.cliente,
      articulos:      detalle.detalles.map(d => ({
        cantidad:       d.cantidad,
        productoNombre: d.productoNombre,
        talla:          d.talla,
        subTotal:       d.subTotal
      })) as ITicketArticulo[],
      total:          pedido.totalPedido,
      totalPagado:    tipo === 'liquidado' ? pedido.totalPedido : pedido.totalPagado,
      saldoPendiente: tipo === 'liquidado' ? 0 : pedido.saldo,
      abonoHoy:       body.monto,
      metodoPago:     metodoPago,
      montoDado:      montoDado > 0 ? montoDado : null,
      cambio:         cambio > 0 ? cambio : null
    };
  }

  // ── Modal transferencia ───────────────────────────────────────────

  abrirModalTransferencia(c: ReporteCancelado): void {
    this.pedidoCancelado           = c;
    this.varianteElegida           = null;
    this.terminoTransferencia      = '';
    this.resultadosTransferencia   = [];
    this.precioEditable            = 0;
    this.precioOriginal            = 0;
    this.cantidadTransferir        = 1;
    this.modalTransferenciaAbierto = true;
  }

  cerrarModalTransferencia(): void {
    this.modalTransferenciaAbierto = false;
    this.pedidoCancelado = null;
  }

  onInputTransferencia(): void {
    if (!this.terminoTransferencia.trim()) { this.resultadosTransferencia = []; return; }
    this.transferSub$.next(this.terminoTransferencia);
  }

  seleccionarVarianteTransferencia(v: IVarianteResumen): void {
    this.varianteElegida         = v;
    this.precioOriginal          = v.precio ?? 0;
    this.precioEditable          = this.precioOriginal;
    this.resultadosTransferencia = [];
    this.terminoTransferencia    = [v.nombreProducto, v.talla, v.color].filter(Boolean).join(' — ');
  }

  get totalNuevo(): number {
    return +(this.precioEditable * this.cantidadTransferir).toFixed(2);
  }

  get saldoPendienteTransfer(): number {
    return Math.max(0, +(this.totalNuevo - (this.pedidoCancelado?.saldoAFavor ?? 0)).toFixed(2));
  }

  get precioEditado(): boolean {
    return this.varianteElegida !== null && this.precioEditable !== this.precioOriginal;
  }

  aplicarTransferencia(): void {
    if (!this.pedidoCancelado || !this.varianteElegida || this.transfiriendo) return;
    this.transfiriendo = true;
    const body: TransferirAbonoRequest = {
      nuevaVarianteId: this.varianteElegida.id,
      cantidad:        this.cantidadTransferir,
      precioUnitario:  this.precioEditable,
      usuarioId:       this.idUsuario
    };
    this.abonoService.transferir(this.pedidoCancelado.pedidoId, body)
      .pipe(finalize(() => this.transfiriendo = false))
      .subscribe({
        next: res => {
          const t = res?.data;
          if (!t) { this.cerrarModalTransferencia(); return; }
          const msg = t.estadoNuevoPedido === 'PAGADO'
            ? `Pedido #${t.nuevoPedidoId} quedó liquidado con el saldo.`
            : `Pedido #${t.nuevoPedidoId} creado. Saldo pendiente: $${t.saldoPendiente.toFixed(2)}`;
          Swal.fire({ icon: 'success', title: 'Transferencia aplicada', text: msg, timer: 3000, showConfirmButton: false });
          this.cerrarModalTransferencia();
          this.cancelados = [];
          if (t.estadoNuevoPedido !== 'PAGADO') this.cargarCuenta();
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo aplicar la transferencia.' });
        }
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────

  toggleDetalle(id: number): void {
    this.expandidoId = this.expandidoId === id ? null : id;
  }

  toggleDetallePagado(id: number): void {
    this.expandidoPagadoId = this.expandidoPagadoId === id ? null : id;
  }

  toggleDetalleCancelado(id: number): void {
    this.expandidoCanceladoId = this.expandidoCanceladoId === id ? null : id;
  }

  porcentajePagado(ec: EstadoCuenta): number {
    if (!ec.totalPedido) return 0;
    return Math.min(100, Math.round((ec.totalPagado / ec.totalPedido) * 100));
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
