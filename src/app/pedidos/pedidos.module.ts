import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PedidosRoutingModule } from './pedidos-routing.module';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';
import { HistorialMpComponent } from './historial-mp/historial-mp.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { FechaEspanolPipe } from '../fecha-espanol.pipe';
import { TotalPedidoPipe } from '../shared/total-pedido.pipe';
import { DetallePedidoComponent } from './detalle-pedido/detalle-pedido.component';

@NgModule({
  declarations: [
    MisPedidosComponent,
    HistorialMpComponent,
    FechaEspanolPipe,
    TotalPedidoPipe,
    DetallePedidoComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PedidosRoutingModule,
    CardModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
  ]
})
export class PedidosModule { }
