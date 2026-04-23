import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgregarComponent } from './agregar/agregar.component';
import { UpdateVarianteComponent } from './update-variante/update-variante.component';
import { BuscarComponent } from './buscar/buscar.component';
import { AuthGuard } from '../auth.guard';

const routes: Routes = [
  { path: 'buscar', component: BuscarComponent,        canActivate: [AuthGuard] },
  { path: 'venta',  component: AgregarComponent,       canActivate: [AuthGuard] },
  { path: 'update', component: UpdateVarianteComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgregarRoutingModule { }
