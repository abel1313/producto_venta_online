import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddVentaComponent } from './add-venta/add-venta.component';
import { BuscarVentaComponent } from './buscar-venta/buscar-venta.component';
import { AuthGuard } from 'src/app/auth.guard';

const routes: Routes = [

    {
      path: 'venta', component: AddVentaComponent, canActivate: [AuthGuard]
    },
    {
      path: 'buscar', component: BuscarVentaComponent, canActivate: [AuthGuard]
    },
    {
      path: '' ,redirectTo: 'venta', pathMatch:'full' ,
    }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VentaProductoRoutingModule { }
