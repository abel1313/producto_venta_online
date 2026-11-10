import { Component, EventEmitter, Output } from '@angular/core';
import { CobroPedidoBase } from '../cobro-pedido.base';
import { AVISO_IR_PAGANDO_CAMPANA } from '../../aviso-ir-pagando-campana';

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
  /** El mismo aviso de campaña que Detalle del pedido al pasar a Ir pagando. */
  readonly avisoIrPagandoCampana = AVISO_IR_PAGANDO_CAMPANA;

  protected alCargar(): void {
    this.monto = this.saldo;
  }
}
