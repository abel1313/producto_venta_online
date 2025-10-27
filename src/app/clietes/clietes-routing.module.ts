import { NgModule } from '@angular/core';
import { RouterModule, Routes, CanActivate } from '@angular/router';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { RegistrosGuard } from '../clientes/registros.guard';
import { AuthGuard } from '../auth.guard';
import { SinRegistroGuard } from '../guard/sin-registro.guard';

const routes: Routes = [
    {
      path: 'mis-datos', component: MisDatosComponent, canActivate: [AuthGuard, SinRegistroGuard]
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
