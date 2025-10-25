import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PaginaNoDisponibleComponent } from './pagina-no-disponible/pagina-no-disponible.component';
import { HomeComponent } from './home/home.component';
import { CarritoGuard } from './guards/carrito.guard';
import { UsuariosGuard } from './auth/usuarios.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('../app/login/login.module').then(m => m.LoginModule),
    canActivate: [CarritoGuard, UsuariosGuard]
  },
  {
    path: 'productos',
    loadChildren: () => import('./productos/producto/producto.module').then(m => m.ProductoModule),
    canActivate: [CarritoGuard]
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/venta-producto/venta-producto.module').then(m => m.VentaProductoModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'gastos',
    loadChildren: () => import('./gastos/mis-gastos/mis-gastos.module').then(m => m.MisGastosModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'rifas',
    loadChildren: () => import('./rifas/rifas.module').then(m => m.RifasModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'clientes',
    loadChildren: () => import('./clietes/clietes.module').then(m => m.ClietesModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./usuarios/usuarios/usuarios.module').then(m => m.UsuariosModule),
    canActivate: [CarritoGuard, UsuariosGuard]
  },
  {
    path: 'home', component: HomeComponent,
    canActivate: [CarritoGuard]
  },
  {
    path: '', redirectTo: 'productos/buscar', pathMatch: 'full'
  },

  {
    path: '**',
    component: PaginaNoDisponibleComponent,
    canActivate: [CarritoGuard]
  },



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
