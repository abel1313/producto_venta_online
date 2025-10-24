import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from './add/add.component';
import { UpdateComponent } from './update/update.component';
import { BuscaComponent } from './busca/busca.component';
import { AuthGuard } from 'src/app/auth.guard';
import { DetalleProductoComponent } from './detalle-producto/detalle-producto.component';
import { DetalleProductosComponent } from './detalle-productos/detalle-productos.component';

const routes: Routes = [

  {
    path: 'agregar', component: AddComponent, canActivate: [AuthGuard]
  },
  {
    path: 'update', component: UpdateComponent, canActivate: [AuthGuard]
  },
  {
    path: 'buscar', component: BuscaComponent
  },
  { path: 'detalle-producto/:id', component: DetalleProductoComponent },
  { path: 'detalle-productos', component: DetalleProductosComponent },
  {
    path: '', redirectTo: 'agregar', pathMatch: 'full',
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductoRoutingModule { }
