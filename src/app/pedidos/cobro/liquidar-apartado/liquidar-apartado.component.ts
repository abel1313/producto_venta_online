import { Component, EventEmitter, Output } from '@angular/core';
import { CobroPedidoBase } from '../cobro-pedido.base';

/**
 * 💵 Liquidar (Apartado suelto). Un Apartado es sin dinero y se paga completo al recogerlo: el monto
 * es lo que debe y no se escribe. Si el cliente deja solo una parte, el pedido se cambia a Ir pagando
 * en su detalle (regla 2.1).
 */
@Component({
  selector: 'app-liquidar-apartado',
  templateUrl: './liquidar-apartado.component.html',
  styleUrls: ['../cobro.scss']
})
export class LiquidarApartadoComponent extends CobroPedidoBase {
  readonly montoFijo = true;
  /** "¿Dejó solo una parte?": abre el detalle para cambiar la forma de cobro. */
  @Output() irAlDetalle = new EventEmitter<void>();

  protected alCargar(): void {
    this.monto = this.saldo;
  }
}
