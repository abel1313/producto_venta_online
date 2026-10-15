import { Component } from '@angular/core';
import { CobroGrupoBase } from '../cobro-grupo.base';

/**
 * 💵 Liquidar (Apartados unidos). Aunque estén unidos siguen siendo Apartados: se pagan completos.
 * El monto es el saldo de todo el grupo y no se escribe.
 */
@Component({
  selector: 'app-liquidar-grupo',
  templateUrl: './liquidar-grupo.component.html',
  styleUrls: ['../cobro.scss']
})
export class LiquidarGrupoComponent extends CobroGrupoBase {
  readonly montoFijo = true;

  protected alCargar(): void {
    this.monto = this.saldo;
  }
}
