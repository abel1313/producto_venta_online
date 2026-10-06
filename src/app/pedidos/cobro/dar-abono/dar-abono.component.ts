import { Component } from '@angular/core';
import { CobroPedidoBase } from '../cobro-pedido.base';

/** 💳 Dar abono (Ir pagando suelto): el monto lo escribe quien cobra, hasta lo que se debe. */
@Component({
  selector: 'app-dar-abono',
  templateUrl: './dar-abono.component.html',
  styleUrls: ['../cobro.scss']
})
export class DarAbonoComponent extends CobroPedidoBase {
  readonly montoFijo = false;

  protected alCargar(): void {
    this.monto = 0;
  }
}
