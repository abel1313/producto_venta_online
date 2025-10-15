import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';
import { AllComponent } from '../all/all.component';
import { AuthGuard } from 'src/app/auth.guard';

const routes: Routes = [

  {
    path: 'agregar', component: AddComponent, canActivate: [AuthGuard]
  },
  {
    path: 'buscar', component: AllComponent, canActivate: [AuthGuard]
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
