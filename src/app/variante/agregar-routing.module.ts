import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgregarComponent } from './agregar/agregar.component';
import { UpdateVarianteComponent } from './update-variante/update-variante.component';
import { BuscarComponent } from './buscar/buscar.component';
import { VentaVarianteComponent } from './venta-variante/venta-variante.component';
import { DetalleVarianteComponent } from './detalle-variante/detalle-variante.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: 'buscar',                component: BuscarComponent },
  { path: 'venta',                 component: AgregarComponent,         canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'update',                component: UpdateVarianteComponent,  canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'carrito',               component: VentaVarianteComponent },
  { path: 'detalle/:id',           component: DetalleVarianteComponent },
  { path: 'detalle/producto/:productoId', component: DetalleVarianteComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgregarRoutingModule { }
