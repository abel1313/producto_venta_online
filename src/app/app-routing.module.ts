import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PaginaNoDisponibleComponent } from './pagina-no-disponible/pagina-no-disponible.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('../app/login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'productos',
    loadChildren: () => import('./productos/producto/producto.module').then(m => m.ProductoModule)
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/venta-producto/venta-producto.module').then(m => m.VentaProductoModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'gastos',
    loadChildren: () => import('./gastos/mis-gastos/mis-gastos.module').then(m => m.MisGastosModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'rifas',
    loadChildren: () => import('./rifas/rifas.module').then(m => m.RifasModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'home', component: HomeComponent
  },
  {
    path: 'paginaNoDisponible', component: PaginaNoDisponibleComponent
  },
  {
    path: '', redirectTo: 'login', pathMatch: 'full'
  }



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
