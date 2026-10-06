import { Directive, EventEmitter, Output } from '@angular/core';
import { Observable, of } from 'rxjs';
import Swal from 'sweetalert2';

export type MetodoCobro = 'EFECTIVO' | 'TRANSFERENCIA';

/**
 * Lo que es igual en todos los formularios de cobro de la card: método de pago (efectivo o
 * transferencia, nunca tarjeta: regla de abonos), monto recibido y cambio, validaciones comunes y el
 * paso de guardar. Cada formulario hereda esto y pone solo lo suyo (ver README de esta carpeta).
 */
@Directive()
export abstract class FormularioCobroBase {
  @Output() cerrar = new EventEmitter<void>();
  /** Ya se cobró: la lista vuelve a pedir la card. */
  @Output() cobrado = new EventEmitter<void>();

  monto = 0;
  metodoPago: MetodoCobro = 'EFECTIVO';
  montoDado = 0;
  nota = '';
  guardando = false;
  cargando = true;

  /** Lo que se debe hoy (del pedido o del grupo). */
  abstract get saldo(): number;
  /** Liquidar: el monto es lo que se debe y no se escribe. */
  abstract readonly montoFijo: boolean;

  get cambio(): number {
    return this.metodoPago === 'EFECTIVO' && this.montoDado > this.monto
      ? +(this.montoDado - this.monto).toFixed(2)
      : 0;
  }

  /** Aviso debajo del monto mientras se escribe. */
  get errorMonto(): string | null {
    if (!(this.monto > 0)) return null;
    if (this.monto - this.saldo > 0.01) return `Es más de lo que se debe: el saldo es de $${this.saldo.toFixed(2)}.`;
    return null;
  }

  get puedeGuardar(): boolean {
    return !this.cargando && !this.guardando && this.saldo > 0.005 && this.monto > 0 && !this.errorMonto;
  }

  guardar(): void {
    if (this.guardando) return;
    const error = this.validar();
    if (error) {
      Swal.fire({ icon: 'warning', title: 'Revisa el cobro', text: error });
      return;
    }
    this.guardando = true;
    this.antesDeCobrar().subscribe(seguir => {
      if (!seguir) { this.guardando = false; return; }
      this.cobrar().subscribe({
        next: () => { this.guardando = false; this.cobrado.emit(); },
        error: err => { this.guardando = false; this.avisarError(err); }
      });
    });
  }

  cancelar(): void {
    if (!this.guardando) this.cerrar.emit();
  }

  protected validar(): string | null {
    if (!(this.monto > 0)) return 'El monto tiene que ser mayor a cero.';
    if (this.monto - this.saldo > 0.01) return `El monto es mayor a lo que se debe ($${this.saldo.toFixed(2)}).`;
    if (this.metodoPago === 'EFECTIVO' && this.montoDado > 0 && this.montoDado < this.monto) {
      return 'Lo que entregó el cliente es menos que el monto.';
    }
    return null;
  }

  /** Paso previo opcional antes de mandar el cobro; `false` = no cobrar. */
  protected antesDeCobrar(): Observable<boolean> {
    return of(true);
  }

  /** Manda el cobro al back y muestra el resultado. */
  protected abstract cobrar(): Observable<unknown>;

  protected avisarError(err: any): void {
    if (err?.status === 403) {
      Swal.fire({ icon: 'warning', title: 'Sin permiso',
        text: 'Si el permiso ya se dio de alta, cierra sesión y vuelve a entrar: los permisos viajan dentro del token.' });
      return;
    }
    Swal.fire({ icon: 'error', title: 'No se pudo cobrar',
      text: (err?.error?.mensaje ?? err?.error?.message) ?? 'Intenta de nuevo.' });
  }
}
