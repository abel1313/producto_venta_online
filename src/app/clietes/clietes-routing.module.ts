import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { RegistrosGuard } from '../clientes/registros.guard';

const routes: Routes = [
    {
      path: 'mis-datos', component: MisDatosComponent, canActivate: [RegistrosGuard]
    },
    {
      path: '', redirectTo: 'agregar', pathMatch: 'full',
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClietesRoutingModule { }
