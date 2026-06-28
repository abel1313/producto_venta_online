import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PaginaNoDisponibleComponent } from './pagina-no-disponible/pagina-no-disponible.component';
import { HomeComponent } from './home/home.component';
import { CarritoGuard } from './guards/carrito.guard';
import { UsuariosGuard } from './auth/usuarios.guard';
import { SinRegistroGuard } from './guard/sin-registro.guard';
import { AdminGuardGuard } from './guard/admin-guard.guard';
import { QrVentasJadeComponent } from './qr-ventas-jade/qr-ventas-jade.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('../app/login/login.module').then(m => m.LoginModule),
    canActivate: [CarritoGuard, UsuariosGuard]
  },
  {
    path: 'productos',
    loadChildren: () => import('./productos/producto/producto.module').then(m => m.ProductoModule),
    canActivate: [CarritoGuard, AuthGuard, AdminGuardGuard]
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/venta-producto/venta-producto.module').then(m => m.VentaProductoModule),
    canActivate: [AuthGuard, AdminGuardGuard,CarritoGuard]
  },
  {
    path: 'gastos',
    loadChildren: () => import('./gastos/mis-gastos/mis-gastos.module').then(m => m.MisGastosModule),
    canActivate: [AuthGuard, AdminGuardGuard, CarritoGuard]
  },
  {
    path: 'abonos',
    loadChildren: () => import('./abonos/abonos.module').then(m => m.AbonosModule),
    canActivate: [AuthGuard, AdminGuardGuard, CarritoGuard]
  },
    {
    path: 'pedidos',
    loadChildren: () => import('./pedidos/pedidos.module').then(m => m.PedidosModule)
  },
  {
    path: 'rifas',
    loadChildren: () => import('./rifas/rifas.module').then(m => m.RifasModule),
    canActivate: [AuthGuard, AdminGuardGuard, CarritoGuard]
  },
  {
    path: 'chat',
    loadChildren: () => import('./chat/chat.module').then(m => m.ChatModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'variantes',
    loadChildren: () => import('./variante/agregar.module').then(m => m.AgregarModule),
    canActivate: [CarritoGuard]
  },
  {
    path: 'clientes',
    loadChildren: () => import('./clietes/clietes.module').then(m => m.ClietesModule),
    canActivate: [CarritoGuard]
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./usuarios/usuarios/usuarios.module').then(m => m.UsuariosModule),
    canActivate: [CarritoGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard, AdminGuardGuard]
  },
  {
    // Gestión del catálogo de palabras clave — solo admin
    path: 'palabras-clave',
    loadChildren: () => import('./palabras-clave/palabras-clave.module').then(m => m.PalabrasClave),
    canActivate: [AuthGuard, AdminGuardGuard, CarritoGuard]
  },
  {
    path: 'home', component: HomeComponent,
    canActivate: [CarritoGuard]
  },
    {
    path: 'qr', component: QrVentasJadeComponent
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
