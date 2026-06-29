import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AbonoRequest, AbonoResponse, EstadoCuenta, MetodoPago, PedidoPagado } from './models/abono.model';
import { AbonoService } from './service/abono.service';

type Tab = 'cuenta' | 'pagados';

@Component({
  selector: 'app-abonos',
  templateUrl: './abonos.component.html',
  styleUrls: ['./abonos.component.scss']
})
export class AbonosComponent implements OnInit {

  tab: Tab = 'cuenta';

  // ── Estado de cuenta ──────────────────────────────────────────────
  estadoCuenta: EstadoCuenta[]  = [];
  cargandoCuenta                = false;

  // ── Pedidos pagados ───────────────────────────────────────────────
  pagados: PedidoPagado[]       = [];
  cargandoPagados               = false;

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

  readonly metodos: MetodoPago[] = ['EFECTIVO'];

  // ── Detalle expandible (estado de cuenta) ─────────────────────────
  expandidoId: number | null = null;

  // ── Detalle expandible (pagados) ──────────────────────────────────
  expandidoPagadoId: number | null = null;

  constructor(private readonly abonoService: AbonoService) {}

  ngOnInit(): void {
    this.cargarCuenta();
  }

  cambiarTab(t: Tab): void {
    this.tab = t;
    if (t === 'pagados' && !this.pagados.length) this.cargarPagados();
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

  // ── Modal abono ───────────────────────────────────────────────────

  abrirModal(ec: EstadoCuenta): void {
    this.pedidoSeleccionado = ec;
    this.abonoForm = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
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
      fechaPago:  this.abonoForm.fechaPago  || undefined,
      metodoPago: this.abonoForm.metodoPago || undefined,
      nota:       this.abonoForm.nota       || undefined
    };

    this.abonoService.registrarAbono(this.pedidoSeleccionado.pedidoId, body)
      .pipe(finalize(() => this.registrando = false))
      .subscribe({
        next: res => {
          const abono: AbonoResponse = res?.data as AbonoResponse;
          const pedido = this.pedidoSeleccionado!;

          // Actualizar localmente
          pedido.totalPagado = +(pedido.totalPagado + body.monto).toFixed(2);
          pedido.saldo       = +(pedido.totalPedido - pedido.totalPagado).toFixed(2);
          pedido.abonos.push(abono);

          this.cerrarModal();

          if (pedido.saldo <= 0) {
            Swal.fire({ icon: 'success', title: '¡Pedido liquidado!', text: `El pedido #${pedido.pedidoId} de ${pedido.cliente} ha sido liquidado.`, timer: 3000, showConfirmButton: false });
            this.estadoCuenta = this.estadoCuenta.filter(e => e.pedidoId !== pedido.pedidoId);
          } else {
            Swal.fire({ icon: 'success', title: 'Abono registrado', text: `Saldo restante: $${pedido.saldo.toFixed(2)}`, timer: 2000, showConfirmButton: false });
          }
        },
        error: err => {
          Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
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

  porcentajePagado(ec: EstadoCuenta): number {
    if (!ec.totalPedido) return 0;
    return Math.min(100, Math.round((ec.totalPagado / ec.totalPedido) * 100));
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
