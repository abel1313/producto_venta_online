import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgregarComponent } from './agregar/agregar.component';
import { AuthGuard } from '../auth.guard';

const routes: Routes = [

    {
      path: 'venta', component: AgregarComponent, canActivate: [AuthGuard]
    }
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgregarRoutingModule { }
