import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgregarRifaComponent } from './agregar-rifa/agregar-rifa.component';
import { BuscarRifaComponent } from './buscar-rifa/buscar-rifa.component';
import { AuthGuard } from '../auth.guard';

const routes: Routes = [
  {
    path: 'agregar', component: AgregarRifaComponent,
  },
  {
    path: 'buscar', component: BuscarRifaComponent,
  },
  {
    path: '' ,redirectTo: 'agregar', pathMatch:'full' ,
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RifasRoutingModule { }
