import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PromocionesComponent } from './promociones.component';

const routes: Routes = [
  { path: '', component: PromocionesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PromocionesRoutingModule {}
