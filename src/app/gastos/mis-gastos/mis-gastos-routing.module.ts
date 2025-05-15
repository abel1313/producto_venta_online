import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';

const routes: Routes = [

  {
    path: 'agregar', component: AddComponent
  },
  {
    path: 'buscar', component: BuscarComponent
  },
  {
    path: '' ,redirectTo: 'agregar', pathMatch:'full' ,
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MisGastosRoutingModule { }
