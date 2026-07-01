import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../auth/auth.service';
import { IVarianteResumen } from '../variante/models/variante.model';
import { VarianteService } from '../variante/service/variante.service';
import {
  AbonoRequest, CancelarAbonoRequest, EstadoCuenta, MetodoPago,
  PedidoPagado, ReporteCancelado, TransferirAbonoRequest
} from './models/abono.model';
import { AbonoService } from './service/abono.service';

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

  // ── Usuario ───────────────────────────────────────────────────────
  idUsuario = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private readonly abonoService:    AbonoService,
    private readonly authService:     AuthService,
    private readonly varianteService: VarianteService
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
          const stockMsg = res?.data?.stockDevuelto ? ' El stock fue devuelto — el buscador de variantes mostrará el dato actualizado.' : '';
          Swal.fire({ icon: 'success', title: 'Cancelado', text: (res?.data?.mensaje ?? 'Pedido cancelado.') + stockMsg, timer: 3500, showConfirmButton: false });
          this.cargarCuenta();
          this.cancelados = [];
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
    this.modalAbierto = true;
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
    const body: AbonoRequest = {
      monto:      this.abonoForm.monto,
      usuarioId:  this.idUsuario,
      fechaPago:  this.abonoForm.fechaPago  || undefined,
      metodoPago: this.abonoForm.metodoPago || undefined,
      nota:       this.abonoForm.nota       || undefined,
      montoDado:  this.abonoForm.metodoPago === 'EFECTIVO' && this.montoDado > 0 ? this.montoDado : undefined
    };

    this.abonoService.registrarAbono(this.pedidoSeleccionado.pedidoId, body)
      .pipe(finalize(() => this.registrando = false))
      .subscribe({
        next: res => {
          const data   = res?.data;
          const pedido = this.pedidoSeleccionado!;

          pedido.saldo       = data?.saldoRestante ?? +(pedido.saldo - body.monto).toFixed(2);
          pedido.totalPagado = +(pedido.totalPedido - pedido.saldo).toFixed(2);
          if (data) pedido.abonos.push(data);

          const cambioMostrar = this.cambio;
          this.cerrarModal();

          if (data?.estadoPedido === 'PAGADO' || pedido.saldo <= 0) {
            const txtCambio = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';
            Swal.fire({ icon: 'success', title: '¡Pedido liquidado!', text: `El pedido #${pedido.pedidoId} de ${pedido.cliente} ha sido liquidado.${txtCambio}`, timer: 4000, showConfirmButton: false });
            this.cargarCuenta();
          } else {
            const txtCambio = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';
            Swal.fire({ icon: 'success', title: 'Abono registrado', text: `Saldo restante: $${pedido.saldo.toFixed(2)}.${txtCambio}`, timer: 2500, showConfirmButton: false });
          }
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
        }
      });
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
