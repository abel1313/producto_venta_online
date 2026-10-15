import { Directive, Input, OnInit, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AbonoRequest, AbonoResponse, PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { AuthService } from 'src/app/auth/auth.service';
import { FloresService } from 'src/app/flores/service/flores.service';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { hoyIso } from 'src/app/shared/fecha.util';
import { generarHtmlTicket, imprimirTicket, ITicketArticulo, ITicketData } from 'src/app/shared/ticket.util';
import { PedidosService } from '../pedidos.service';
import { FormularioCobroBase } from './formulario-cobro.base';

/**
 * Cobro de UN pedido (`POST /v1/abonos/{pedidoId}`), con lo mismo que hace el modal de Créditos /
 * Abonos: fecha del pago, ticket para imprimir, correo, y antes de cobrar la revisión del cargo de un
 * ramo urgente (si el pago llegó tarde el total sube y no se debe cobrar el monto viejo).
 */
@Directive()
export abstract class CobroPedidoBase extends FormularioCobroBase implements OnInit {
  @Input() pedidoId!: number;

  protected readonly pedidosService = inject(PedidosService);
  private readonly abonoService = inject(AbonoService);
  private readonly floresService = inject(FloresService);
  private readonly negocioService = inject(NegocioService);
  private readonly authService = inject(AuthService);

  detalle: PedidoDetalleResponse | null = null;
  fechaPago = hoyIso();
  enviarCorreo = false;

  private qr: Pick<ITicketData, 'qrTienda' | 'qrWhatsapp' | 'qrFacebook' | 'qrInstagram' | 'qrTiktok'> =
    { qrTienda: window.location.origin };

  get saldo(): number {
    return this.detalle?.saldoPendiente ?? 0;
  }

  get correoCliente(): string {
    return this.detalle?.clienteCorreo ?? '';
  }

  ngOnInit(): void {
    this.negocioService.getContactosPublicos().subscribe({
      next: c => this.qr = { qrTienda: c.tiendaUrl || window.location.origin, qrWhatsapp: c.whatsappUrl || null,
        qrFacebook: c.facebookUrl || null, qrInstagram: c.instagramUrl || null, qrTiktok: c.tiktokUrl || null },
      error: () => {}
    });
    this.cargarDetalle();
  }

  /** Cada formulario pone el monto con el que arranca. */
  protected abstract alCargar(): void;

  private cargarDetalle(): void {
    this.cargando = true;
    this.pedidosService.getDetallePedido(this.pedidoId).subscribe({
      next: r => {
        this.detalle = r?.data ?? null;
        this.cargando = false;
        this.alCargar();
      },
      error: () => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo abrir el pedido', text: 'Revisa tu conexión e inténtalo de nuevo.' });
        this.cerrar.emit();
      }
    });
  }

  protected override antesDeCobrar(): Observable<boolean> {
    return this.floresService.revalidarAntesDePagar(this.pedidoId).pipe(
      map(r => {
        if (!r?.cargoRecienAplicado) return true;
        Swal.fire({
          icon: 'warning',
          title: 'El total de este pedido cambió',
          html: `<p>${r.mensaje ?? 'Se aplicó el cargo por entrega urgente porque el pago llegó después de la hora límite.'}</p>
                 <p>Nuevo total: <b>$${r.totalActual.toFixed(2)}</b></p>`,
          confirmButtonText: 'Entendido'
        });
        this.cargarDetalle();
        return false;
      }),
      // Si la revisión falla por red se cobra igual: no se bloquea un abono normal por esto.
      catchError(() => of(true))
    );
  }

  protected cobrar(): Observable<unknown> {
    const d = this.detalle!;
    const efectivo = this.metodoPago === 'EFECTIVO';
    const body: AbonoRequest = {
      monto:      this.monto,
      usuarioId:  this.authService.userIdValue || undefined,
      fechaPago:  this.fechaPago || undefined,
      metodoPago: this.metodoPago,
      nota:       this.nota.trim() || undefined,
      montoDado:  efectivo && this.montoDado > 0 ? this.montoDado : undefined
    };
    const liquida = this.saldo - this.monto <= 0.01;
    const ticket = this.ticket(d, body, liquida);
    if (this.enviarCorreo && this.correoCliente) {
      body.notificacion = { enviarCorreo: true, ticketHtml: ticket };
    }
    const cambio = this.cambio;
    return this.abonoService.registrarAbono(this.pedidoId, body).pipe(
      tap(res => this.mostrarResultado(d, body, res?.data ?? null, liquida, cambio, ticket))
    );
  }

  private ticket(d: PedidoDetalleResponse, body: AbonoRequest, liquida: boolean): string {
    const pagadoTras = +(d.totalPagado + body.monto).toFixed(2);
    return generarHtmlTicket({
      tipo:           liquida ? 'liquidado' : 'abono',
      numero:         d.pedidoId,
      cliente:        d.clienteNombre,
      articulos:      d.detalles.map(x => ({ cantidad: x.cantidad, productoNombre: x.productoNombre, talla: x.talla, subTotal: x.subTotal })) as ITicketArticulo[],
      total:          d.totalPedido,
      totalPagado:    liquida ? d.totalPedido : pagadoTras,
      saldoPendiente: liquida ? 0 : Math.max(0, +(d.saldoPendiente - body.monto).toFixed(2)),
      abonoHoy:       body.monto,
      abonos:         [...(d.abonos ?? []).map(a => ({ monto: a.monto, fecha: a.fechaPago })), { monto: body.monto, fecha: body.fechaPago ?? hoyIso() }],
      metodoPago:     body.metodoPago ?? 'EFECTIVO',
      montoDado:      body.montoDado ?? null,
      cambio:         body.montoDado ? +(body.montoDado - body.monto).toFixed(2) : null,
      ...this.qr
    });
  }

  private mostrarResultado(d: PedidoDetalleResponse, body: AbonoRequest, res: AbonoResponse | null,
                           liquida: boolean, cambio: number, ticket: string): void {
    const liquidado = res?.estadoPedido === 'PAGADO' || liquida;
    const saldoTras = Math.max(0, +(d.saldoPendiente - body.monto).toFixed(2));
    const txtCambio = cambio > 0 ? ` Cambio al cliente: $${cambio.toFixed(2)}.` : '';
    const texto = liquidado
      ? `El pedido #${d.pedidoId} de ${d.clienteNombre} ha sido liquidado.${txtCambio}`
      : `Saldo restante: $${saldoTras.toFixed(2)}.${txtCambio}`;
    const envio: string[] = [];
    if (res?.correoEnviado === true) envio.push('✅ Correo enviado al cliente');
    if (res?.whatsappEnviado === true) envio.push('✅ WhatsApp enviado al cliente');
    (res?.erroresEnvio ?? []).forEach(e => envio.push(`⚠️ ${e}`));
    const tieneCorreo = !!this.correoCliente;

    Swal.fire({
      icon: 'success',
      title: liquidado ? '¡Pedido liquidado!' : 'Abono registrado',
      html: `<p style="margin:0 0 8px">${escapar(texto)}</p>${envio.map(l => `<p style="margin:0">${escapar(l)}</p>`).join('')}`,
      showConfirmButton: true,
      confirmButtonText: '🖨️ Imprimir ticket',
      showCancelButton: true,
      cancelButtonText: 'Cerrar'
    }).then(r => {
      if (r.isConfirmed) imprimirTicket(ticket);
      if (!tieneCorreo) this.pedirCorreo(d.pedidoId, ticket);
    });
  }

  private pedirCorreo(pedidoId: number, ticket: string): void {
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
      this.pedidosService.reenviarComprobante(pedidoId, { correo: res.value, ticketHtml: ticket }).subscribe({
        next: (r: any) => Swal.fire({ icon: 'success', title: '✅ Enviado', text: r?.data ?? `Ticket enviado a ${res.value}`, timer: 2000, showConfirmButton: false }),
        error: err => Swal.fire({ icon: 'error', title: 'Error al enviar', text: err?.error?.mensaje ?? 'No se pudo enviar el correo.' })
      });
    });
  }
}

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
