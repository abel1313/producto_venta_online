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
  montoDado = 0;

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
    this.abonoService.registrarAbono(this.pedido.pedido.id, body).subscribe({
      next: res => {
        this.registrandoAbono = false;
        const data        = res?.data;
        const cambioMostrar = this.cambio;
        this.mostrarFormAbono = false;
        const liquidado   = data?.estadoPedido === 'PAGADO' || (data?.saldoRestante != null && data.saldoRestante <= 0);
        const txtCambio   = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';
        if (liquidado) {
          Swal.fire({ icon: 'success', title: '¡Pedido liquidado!', text: `El pedido #${this.pedido.pedido.id} ha sido liquidado.${txtCambio}`, timer: 3500, showConfirmButton: false });
        } else {
          const saldo = data?.saldoRestante != null ? ` Saldo restante: $${data.saldoRestante.toFixed(2)}.` : '';
          Swal.fire({ icon: 'success', title: 'Abono registrado', text: `${saldo}${txtCambio}`, timer: 2500, showConfirmButton: false });
        }
      },
      error: err => {
        this.registrandoAbono = false;
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
      }
    });
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
