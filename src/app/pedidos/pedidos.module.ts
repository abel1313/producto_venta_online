import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PedidosRoutingModule } from './pedidos-routing.module';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FechaEspanolPipe } from '../fecha-espanol.pipe';
import { TotalPedidoPipe } from '../shared/total-pedido.pipe';
import { DetallePedidoComponent } from './detalle-pedido/detalle-pedido.component';

@NgModule({
  declarations: [
    MisPedidosComponent,
    FechaEspanolPipe,
    TotalPedidoPipe,
    DetallePedidoComponent
  ],
  imports: [
    CommonModule,
    PedidosRoutingModule,
    CardModule,
    ButtonModule,
  ]
})
export class PedidosModule { }
