import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';
import { AllComponent } from '../all/all.component';

const routes: Routes = [
  { path: 'buscar',  component: AllComponent },
  { path: 'agregar', component: AddComponent },
  { path: '', redirectTo: 'buscar', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MisGastosRoutingModule {}
