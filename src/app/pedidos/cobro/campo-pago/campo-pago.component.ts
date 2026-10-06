import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MetodoCobro } from '../formulario-cobro.base';

/**
 * La parte de pantalla que se repite en todos los cobros: efectivo o transferencia y, en efectivo,
 * el monto recibido con su cambio. Mismo comportamiento que el modal de Créditos / Abonos.
 */
@Component({
  selector: 'app-campo-pago',
  templateUrl: './campo-pago.component.html',
  styleUrls: ['../cobro.scss']
})
export class CampoPagoComponent {
  @Input() metodoPago: MetodoCobro = 'EFECTIVO';
  @Output() metodoPagoChange = new EventEmitter<MetodoCobro>();
  @Input() montoDado = 0;
  @Output() montoDadoChange = new EventEmitter<number>();
  /** El monto que se cobra: contra él se calcula el cambio. */
  @Input() monto = 0;
  @Input() cambio = 0;

  readonly metodos: { valor: MetodoCobro; texto: string }[] = [
    { valor: 'EFECTIVO', texto: '💵 Efectivo' },
    { valor: 'TRANSFERENCIA', texto: '🏦 Transferencia' }
  ];

  elegir(m: MetodoCobro): void {
    this.metodoPagoChange.emit(m);
    this.montoDadoChange.emit(0);
  }
}
