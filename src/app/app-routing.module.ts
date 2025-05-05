import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [

  {
    path: 'productos',
    loadChildren: () => import('./productos/producto/producto.module').then(m => m.ProductoModule)
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/venta-producto/venta-producto.module').then(m => m.VentaProductoModule)
  },
  {
    path:'', redirectTo:'productos',pathMatch:'full'
  }

  

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
