import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisPedidosComponent } from './mis-pedidos/mis-pedidos.component';
import { HistorialMpComponent } from './historial-mp/historial-mp.component';
import { PagoResultadoComponent } from './pago-resultado/pago-resultado.component';
import { AuthGuard } from '../auth.guard';
import { PantallaGuard } from '../guard/pantalla.guard';

// AdminGuardGuard se quitó de "historial-mp" -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27). "mis-pedidos" es de cualquier usuario logueado (se queda solo con AuthGuard);
// "historial-mp" es admin y sí tiene Submenu.ruta propio ("pedidos/historial-mp" en
// migration_menu_submenu.sql), así que usa PantallaGuard directo (ver pantalla.guard.ts).
const routes: Routes = [
  { path: 'mis-pedidos',  component: MisPedidosComponent,  canActivate: [AuthGuard] },
  // A donde regresa el cliente desde la página de pago de Mercado Pago (back_urls). Solo pregunta el estado al back.
  { path: 'pago-resultado', component: PagoResultadoComponent, canActivate: [AuthGuard] },
  { path: 'historial-mp', component: HistorialMpComponent, canActivate: [AuthGuard, PantallaGuard] },
  { path: '', redirectTo: 'mis-pedidos', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PedidosRoutingModule { }
