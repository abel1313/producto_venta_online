import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { AuthGuard } from '../auth.guard';

const routes: Routes = [
  { path: 'agregar',   component: ClientesAddComponent, canActivate: [AuthGuard] },
  { path: 'mis-datos', component: MisDatosComponent,    canActivate: [AuthGuard] },
  { path: '', redirectTo: 'agregar', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClietesRoutingModule { }
