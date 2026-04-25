import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';
import { HistorialMpComponent } from './historial-mp/historial-mp.component';
import { AuthGuard } from '../auth.guard';

const routes: Routes = [
    { path: 'mis-pedidos',  component: MisPedidosComponent,  canActivate: [AuthGuard] },
    { path: 'historial-mp', component: HistorialMpComponent, canActivate: [AuthGuard] },
    { path: '', redirectTo: 'mis-pedidos', pathMatch: 'full' },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PedidosRoutingModule { }
