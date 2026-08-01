import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IPedidoGenerico } from '../mis-pedidos/models/IPedidoGenerico.model';
import { environment } from 'src/environments/environment';
import { PedidosService } from '../pedidos.service';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { AbonoRequest, MetodoPago, PedidoDetalleItem, PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import { AuthService } from 'src/app/auth/auth.service';
import { NegocioService } from 'src/app/negocio/negocio.service';
import Swal from 'sweetalert2';
import { generarHtmlTicket, imprimirTicket, ITicketData } from 'src/app/shared/ticket.util';

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit, OnDestroy {
  @Input() pedido!: IPedidoGenerico;
  @Output() regresarProductos = new EventEmitter<boolean>();

  // Base correcta del microservicio de imágenes: GET /imagen/v1/{productoId}
  public env: string = environment.api_Url + '/imagen/v1/';

  // ── Detalle rico (promoción, talla/color, fecha+hora, imagen) ────────
  detalle: PedidoDetalleResponse | null = null;
  cargandoDetalle = false;
  imprimiendoTicket = false;

  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;

  // ── Abono inline ──────────────────────────────────────────────────
  mostrarFormAbono = false;
  registrandoAbono = false;
  idUsuario        = 0;
  readonly metodosAbono: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA'];
  abonoForm: AbonoRequest = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
  montoDado  = 0;
  enviarCorreo = false;

  get correoDisponible(): boolean {
    return !!this.pedido?.cliente?.correoElectronico;
  }

  get isAdmin(): boolean {
    return this.authService.isAdminService;
  }

  get esCredito(): boolean {
    const tp = this.detalle?.tipoPedido ?? this.pedido?.pedido?.tipoPedido;
    return tp === 'APARTADO' || tp === 'FIADO';
  }

  get estadoPedido(): string {
    return this.detalle?.estadoPedido ?? this.pedido?.pedido?.estado_pedido ?? '';
  }

  // Para crédito, `estadoPedido` crudo del back es 'APARTADO'/'FIADO' (mismo valor que
  // tipoPedido) hasta liquidarlo — mostrarlo tal cual repite el badge de tipo que ya está
  // arriba ("📦 Apartado" seguido de "APARTADO"). Se reemplaza por el estado de pago real.
  get estadoPedidoLabel(): string {
    if (this.esCredito) {
      return this.estadoPedido === 'PAGADO' ? 'Pagado' : 'Por cobrar';
    }
    return this.estadoPedido;
  }

  // Solo se puede imprimir/reenviar el ticket si ya hay algo que cobrar: NORMAL
  // entregado, o crédito con al menos un abono registrado (o ya liquidado).
  get puedeGenerarTicket(): boolean {
    if (!this.detalle) return false;
    if (this.esCredito) {
      return this.estadoPedido === 'PAGADO' || (this.detalle.abonos?.length ?? 0) > 0;
    }
    return this.estadoPedido === 'Entregado' || this.estadoPedido === 'PAGADO';
  }

  get fechaCompra(): string | null {
    return this.detalle?.fechaHoraRegistro ?? this.detalle?.fechaPedido ?? null;
  }

  get cambio(): number {
    return this.montoDado > 0 && this.montoDado > this.abonoForm.monto
      ? +(this.montoDado - this.abonoForm.monto).toFixed(2)
      : 0;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private readonly pedidosService: PedidosService,
    private readonly abonoService:   AbonoService,
    private readonly authService:    AuthService,
    private readonly negocioService: NegocioService
  ) {}

  ngOnInit(): void {
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });

    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl || null; this.qrFacebook = c.facebookUrl || null; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });

    this.cargarDetalleCompleto();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private cargarDetalleCompleto(): void {
    this.cargandoDetalle = true;
    this.pedidosService.getDetallePedido(this.pedido.pedido.id).subscribe({
      next: r => {
        this.detalle = r?.data ?? null;
        this.cargandoDetalle = false;
      },
      error: () => { this.cargandoDetalle = false; }
    });
  }

  get totalGeneral(): number {
    return this.detalle?.totalPedido
      ?? this.pedido.pedido.detalles.reduce((sum, d) => sum + d.sub_total, 0);
  }

  eliminando = new Set<PedidoDetalleItem>();

  reducirCantidad(item: PedidoDetalleItem): void {
    if (this.eliminando.has(item) || item.productoId == null) return;
    this.eliminando.add(item);

    this.pedidosService.eliminarDetalle(this.pedido.pedido.id, item.productoId).subscribe({
      next: () => {
        item.cantidad -= 1;
        if (item.cantidad <= 0 && this.detalle) {
          this.detalle.detalles = this.detalle.detalles.filter(d => d !== item);
        } else {
          item.subTotal = item.cantidad * item.precioUnitario;
        }
        // El back ya recalcula totalPedido bien server-side, pero acá no se vuelve a pedir
        // el detalle completo (para no perder el estado de la pantalla) — se recalcula igual
        // localmente sumando los subtotales que quedan, así el total mostrado no se queda viejo.
        if (this.detalle) {
          this.detalle.totalPedido = this.detalle.detalles.reduce((sum, d) => sum + d.subTotal, 0);
        }
        this.eliminando.delete(item);
      },
      error: (err) => {
        this.eliminando.delete(item);
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo eliminar el producto.' });
      }
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/img/no-image.png';
  }

  irPedido(): void {
    this.regresarProductos.emit(false);
  }

  // ── Abono inline ──────────────────────────────────────────────────

  abrirFormAbono(): void {
    this.abonoForm = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
    this.montoDado = 0;
    this.mostrarFormAbono = true;
  }

  cancelarFormAbono(): void {
    this.mostrarFormAbono = false;
  }

  registrarAbono(): void {
    if (this.registrandoAbono) return;
    if (!this.abonoForm.monto || this.abonoForm.monto <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    this.registrandoAbono = true;
    const body: AbonoRequest = {
      monto:      this.abonoForm.monto,
      usuarioId:  this.idUsuario,
      fechaPago:  this.abonoForm.fechaPago  || undefined,
      metodoPago: this.abonoForm.metodoPago || undefined,
      nota:       this.abonoForm.nota       || undefined,
      montoDado:  this.abonoForm.metodoPago === 'EFECTIVO' && this.montoDado > 0 ? this.montoDado : undefined
    };
    const correoDisponibleSnap = this.correoDisponible;
    const enviarCorreoSnap     = this.enviarCorreo;
    const pedidoId             = this.pedido.pedido.id;
    // Saldo ANTES de este abono — this.detalle todavía no se recarga (cargarDetalleCompleto()
    // es async, no resuelve a tiempo para el texto del Swal de abajo).
    const totalPedidoSnap      = this.detalle?.totalPedido ?? 0;
    const totalPagadoPrevio    = this.detalle?.totalPagado ?? 0;

    this.abonoService.registrarAbono(pedidoId, body).subscribe({
      next: res => {
        this.registrandoAbono = false;
        const data          = res?.data;
        const cambioMostrar = this.cambio;
        this.mostrarFormAbono = false;
        this.enviarCorreo   = false;
        this.cargarDetalleCompleto();
        // Saldo calculado en local (saldo previo - este abono), no `data.saldoRestante` —
        // visto en vivo, el back podía devolver ese campo reflejando el saldo de ANTES del
        // abono en vez de después, mostrando un mensaje que no cuadraba con lo recién pagado.
        const saldoCalculado = +(totalPedidoSnap - totalPagadoPrevio - body.monto).toFixed(2);
        const liquidado      = data?.estadoPedido === 'PAGADO' || saldoCalculado <= 0;
        const txtCambio      = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';

        const titulo = liquidado ? '¡Pedido liquidado!' : 'Abono registrado';
        const texto  = liquidado
          ? `El pedido #${pedidoId} ha sido liquidado.${txtCambio}`
          : `Saldo restante: $${saldoCalculado.toFixed(2)}.${txtCambio}`;

        Swal.fire({ icon: 'success', title: titulo, text: texto, timer: 3000, showConfirmButton: false }).then(() => {
          if (correoDisponibleSnap && enviarCorreoSnap) {
            // Cliente con correo y checkbox marcado → enviar automáticamente al correo registrado
            this.enviarTicketPorCorreo(pedidoId, this.pedido.cliente.correoElectronico);
          } else if (!correoDisponibleSnap) {
            // Sin correo registrado → preguntar
            this.pedirCorreoPostTransaccion(pedidoId);
          }
        });
      },
      error: err => {
        this.registrandoAbono = false;
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
      }
    });
  }

  private pedirCorreoPostTransaccion(pedidoId: number): void {
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
      if (res.isConfirmed && res.value) this.enviarTicketPorCorreo(pedidoId, res.value);
    });
  }

  private enviarTicketPorCorreo(pedidoId: number, correo: string): void {
    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (d) this.enviarTicketConDetalle(pedidoId, d, correo);
      },
      error: () => {}
    });
  }

  // ── Reenviar ticket: confirma primero con el correo del cliente ────

  reenviarComprobanteManual(): void {
    const pedidoId = this.pedido.pedido.id;
    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (!d) return;
        const correoReg = d.clienteCorreo || this.pedido?.cliente?.correoElectronico || '';
        this.confirmarCorreoYEnviar(pedidoId, d, correoReg);
      },
      error: () => Swal.fire({ title: 'Error', text: 'No se pudo obtener el detalle del pedido.', icon: 'error' })
    });
  }

  private confirmarCorreoYEnviar(pedidoId: number, d: PedidoDetalleResponse, correoReg: string): void {
    if (correoReg) {
      const nombre = d.clienteNombre || this.pedido.cliente.nombreCliente;
      Swal.fire({
        title: '📧 Reenviar ticket',
        html: `¿Enviar el ticket al correo de <b>${nombre}</b>:<br><b>${correoReg}</b>?`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Sí, enviar',
        denyButtonText: 'Usar otro correo',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) this.enviarTicketConDetalle(pedidoId, d, correoReg);
        else if (res.isDenied) this.pedirCorreoManualYEnviar(pedidoId, d);
      });
    } else {
      this.pedirCorreoManualYEnviar(pedidoId, d);
    }
  }

  private pedirCorreoManualYEnviar(pedidoId: number, d: PedidoDetalleResponse): void {
    Swal.fire({
      title: '📧 Reenviar comprobante',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: v => (!v || !v.includes('@')) ? 'Ingresa un correo válido' : null,
    }).then(res => {
      if (res.isConfirmed && res.value) this.enviarTicketConDetalle(pedidoId, d, res.value as string);
    });
  }

  private enviarTicketConDetalle(pedidoId: number, d: PedidoDetalleResponse, correo: string): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'PAGADO' ? 'liquidado'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const html = generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || this.pedido.cliente.nombreCliente,
      metodoPago:     d.metodoPago ?? '',
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      articulos:      d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook
    });
    this.pedidosService.reenviarComprobante(pedidoId, { correo, ticketHtml: html }).subscribe({
      next: (r2: any) => Swal.fire({ title: '✅ Enviado', text: r2?.data ?? `Ticket enviado a ${correo}`, icon: 'success', timer: 2000, showConfirmButton: false }),
      error: err => Swal.fire({ title: 'Error al enviar', text: err?.error?.mensaje ?? 'No se pudo enviar el correo.', icon: 'error' })
    });
  }

  // ── Imprimir ticket (junto a reenviar) ─────────────────────────────

  imprimirTicketDetalle(): void {
    if (this.imprimiendoTicket) return;
    this.imprimiendoTicket = true;
    const pedidoId = this.pedido.pedido.id;

    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        this.imprimiendoTicket = false;
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }

        if (d.metodoPago || d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO') {
          Swal.fire({
            title: `Ticket pedido #${pedidoId}`,
            text: '¿Deseas imprimir el ticket?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimir ticket',
            cancelButtonText: 'Cancelar'
          }).then(res => {
            if (res.isConfirmed) this.imprimirConDetalle(d, d.metodoPago ?? '', d.montoDado ?? null);
          });
          return;
        }

        // Pedido NORMAL antiguo sin metodoPago guardado en BD → preguntar forma de pago
        Swal.fire({
          title: `Ticket pedido #${pedidoId}`,
          text: '¿Cómo se pagó este pedido?',
          icon: 'question',
          input: 'radio',
          inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
          inputValue: 'EFECTIVO',
          showCancelButton: true,
          confirmButtonText: 'Imprimir 🖨️',
          cancelButtonText: 'Cancelar',
          inputValidator: v => (!v ? 'Selecciona la forma de pago' : null)
        }).then(res => {
          if (res.isConfirmed) this.imprimirConDetalle(d, res.value, null);
        });
      },
      error: err => {
        this.imprimiendoTicket = false;
        Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el ticket.', icon: 'error' });
      }
    });
  }

  private imprimirConDetalle(d: PedidoDetalleResponse, metodoPago: string, montoDadoOrig: number | null): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const montoDado = metodoPago === 'EFECTIVO' && montoDadoOrig ? montoDadoOrig : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    imprimirTicket(generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || this.pedido.cliente.nombreCliente,
      metodoPago,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook
    }));
  }

  private formatearFechaTicket(d: PedidoDetalleResponse): string | undefined {
    const fecha = d.fechaHoraRegistro || d.fechaPedido;
    if (!fecha) return undefined;
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
