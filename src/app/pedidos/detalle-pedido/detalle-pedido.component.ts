import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IPedidoGenerico } from '../mis-pedidos/models/IPedidoGenerico.model';
import { IDetalleQuery } from '../mis-pedidos/models/IDetallePedido.model';
import { environment } from 'src/environments/environment';
import { PedidosService } from '../pedidos.service';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { AbonoRequest, MetodoPago } from 'src/app/abonos/models/abono.model';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { generarHtmlTicket, ITicketData } from 'src/app/shared/ticket.util';

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit, OnDestroy {
  @Input() pedido!: IPedidoGenerico;
  @Output() regresarProductos = new EventEmitter<boolean>();

  public env: string = environment.api_Url + '/imagen/';

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

  get esCredito(): boolean {
    const tp = this.pedido?.pedido?.tipoPedido;
    return tp === 'APARTADO' || tp === 'FIADO';
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
    private readonly authService:    AuthService
  ) {}

  ngOnInit(): void {
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get totalGeneral(): number {
    return this.pedido.pedido.detalles.reduce((sum, d) => sum + d.sub_total, 0);
  }

  eliminando = new Set<IDetalleQuery>();

  reducirCantidad(item: IDetalleQuery): void {
    if (this.eliminando.has(item)) return;
    this.eliminando.add(item);

    this.pedidosService.eliminarDetalle(this.pedido.pedido.id, item.producto).subscribe({
      next: () => {
        item.cantidad -= 1;
        if (item.cantidad <= 0) {
          this.pedido.pedido.detalles = this.pedido.pedido.detalles.filter(d => d !== item);
        } else {
          item.sub_total = item.cantidad * item.precio_unitario;
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

    this.abonoService.registrarAbono(pedidoId, body).subscribe({
      next: res => {
        this.registrandoAbono = false;
        const data          = res?.data;
        const cambioMostrar = this.cambio;
        this.mostrarFormAbono = false;
        this.enviarCorreo   = false;
        const liquidado     = data?.estadoPedido === 'PAGADO' || (data?.saldoRestante != null && data.saldoRestante <= 0);
        const txtCambio     = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';

        const titulo = liquidado ? '¡Pedido liquidado!' : 'Abono registrado';
        const texto  = liquidado
          ? `El pedido #${pedidoId} ha sido liquidado.${txtCambio}`
          : `${data?.saldoRestante != null ? `Saldo restante: $${data.saldoRestante.toFixed(2)}.` : ''}${txtCambio}`;

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
        if (!d) return;
        const tipo: ITicketData['tipo'] = d.estadoPedido === 'PAGADO' ? 'liquidado'
          : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
        const html = generarHtmlTicket({
          tipo,
          numero:         d.pedidoId,
          fecha:          d.fechaPedido ? new Date(d.fechaPedido).toLocaleDateString('es-MX') : undefined,
          cliente:        d.clienteNombre || this.pedido.cliente.nombreCliente,
          metodoPago:     d.metodoPago ?? '',
          total:          d.totalPedido,
          totalPagado:    d.totalPagado ?? null,
          saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
          articulos:      d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal }))
        });
        this.pedidosService.reenviarComprobante(pedidoId, { correo, ticketHtml: html }).subscribe({
          next: (r2: any) => Swal.fire({ title: '✅ Enviado', text: r2?.data ?? `Ticket enviado a ${correo}`, icon: 'success', timer: 2000, showConfirmButton: false }),
          error: err => Swal.fire({ title: 'Error al enviar', text: err?.error?.mensaje ?? 'No se pudo enviar el correo.', icon: 'error' })
        });
      },
      error: () => {}
    });
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
