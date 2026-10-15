import { Component } from '@angular/core';
import { CobroGrupoBase } from '../cobro-grupo.base';

/**
 * 💵 Abonar al grupo (Ir pagando unido): cualquier monto hasta el saldo del grupo. El back lo reparte
 * del pedido más viejo al más nuevo (R6 de grupopedido).
 */
@Component({
  selector: 'app-abonar-grupo',
  templateUrl: './abonar-grupo.component.html',
  styleUrls: ['../cobro.scss']
})
export class AbonarGrupoComponent extends CobroGrupoBase {
  readonly montoFijo = false;

  protected alCargar(): void {
    this.monto = 0;
  }
}
