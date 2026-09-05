import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PaginaNoDisponibleComponent } from './pagina-no-disponible/pagina-no-disponible.component';
import { HomeComponent } from './home/home.component';
import { CarritoGuard } from './guards/carrito.guard';
import { UsuariosGuard } from './auth/usuarios.guard';
import { SinRegistroGuard } from './guard/sin-registro.guard';
import { PantallaGuard } from './guard/pantalla.guard';
import { QrVentasJadeComponent } from './qr-ventas-jade/qr-ventas-jade.component';
import { PrivacidadComponent } from './legal/privacidad/privacidad.component';
import { TerminosComponent } from './legal/terminos/terminos.component';
import { TiktokCallbackComponent } from './tiktok-callback/tiktok-callback.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('../app/login/login.module').then(m => m.LoginModule),
    canActivate: [CarritoGuard, UsuariosGuard]
  },
  {
    path: 'productos',
    loadChildren: () => import('./productos/producto/producto.module').then(m => m.ProductoModule),
    canActivate: [CarritoGuard, AuthGuard, PantallaGuard]
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/venta-producto/venta-producto.module').then(m => m.VentaProductoModule),
    canActivate: [AuthGuard, PantallaGuard,CarritoGuard]
  },
  {
    path: 'gastos',
    loadChildren: () => import('./gastos/mis-gastos/mis-gastos.module').then(m => m.MisGastosModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    path: 'abonos',
    loadChildren: () => import('./abonos/abonos.module').then(m => m.AbonosModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    path: 'carga-imagenes',
    loadChildren: () => import('./carga-imagenes/carga-imagenes.module').then(m => m.CargaImagenesModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    path: 'reportes',
    loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
    {
    path: 'pedidos',
    loadChildren: () => import('./pedidos/pedidos.module').then(m => m.PedidosModule)
  },
  {
    path: 'rifas',
    loadChildren: () => import('./rifas/rifas.module').then(m => m.RifasModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    path: 'chat',
    loadChildren: () => import('./chat/chat.module').then(m => m.ChatModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    // Ruta pública "Tienda" — antes /variantes, renombrada solo en la URL (el código interno
    // sigue en src/app/variante/, sin tocar — mismo criterio ya usado para renombrar solo lo
    // visible al usuario, extendido aquí a la URL del navegador).
    path: 'tienda',
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
    canActivate: [AuthGuard, PantallaGuard]
  },
  {
    // Gestión del catálogo de palabras clave — solo quien tenga la pantalla asignada
    path: 'palabras-clave',
    loadChildren: () => import('./palabras-clave/palabras-clave.module').then(m => m.PalabrasClave),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    // Gestión del catálogo de lugares de entrega — solo quien tenga la pantalla asignada
    path: 'lugares-entrega',
    loadChildren: () => import('./lugares-entrega/lugares-entrega.module').then(m => m.LugaresEntregaModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    // "Entregas por zona" (2026-09-04, PantallaGuard agregado 2026-09-05): ya tiene su propia
    // fila en submenu/rol_submenu -- ver migration_submenu_entregas_zona.sql. Antes "vivía de
    // prestado" del grupo de lugares-entrega en el navbar sin guard real en el front.
    path: 'entregas-zona',
    loadChildren: () => import('./entregas-zona/entregas-zona.module').then(m => m.EntregasZonaModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    // Gestión del catálogo de menús/submenús -- Fase 1 de PLAN_PERMISOS_PANTALLAS.md (repo
    // compartido). PantallaGuard aquí también, protegido por la misma tabla que administra.
    path: 'gestion-menu',
    loadChildren: () => import('./menu-admin/menu-admin.module').then(m => m.MenuAdminModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    // Pantalla única de Personalización (colores/fondos/cards/tablas/menú) -- ver
    // migration_tema_negocio.sql para el catálogo submenu/rol_submenu que la habilita.
    path: 'personalizacion',
    loadChildren: () => import('./tema-admin/tema-admin.module').then(m => m.TemaAdminModule),
    canActivate: [AuthGuard, PantallaGuard, CarritoGuard]
  },
  {
    // Flores eternas — el módulo mezcla pantallas admin (catálogos) y una pública (vitrina de
    // ramos armados), así que el guard de admin ya NO va aquí arriba: vive solo en la ruta
    // 'catalogos' dentro de flores-routing.module.ts. Mismo nivel que "Tienda" — sin AuthGuard,
    // un visitante sin sesión también puede ver los ramos armados.
    path: 'flores',
    loadChildren: () => import('./flores/flores.module').then(m => m.FloresModule),
    canActivate: [CarritoGuard]
  },
  {
    path: 'promociones',
    loadChildren: () => import('./promociones/promociones.module').then(m => m.PromocionesModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'favoritos',
    loadChildren: () => import('./favoritos/favoritos.module').then(m => m.FavoritosModule),
    canActivate: [AuthGuard, CarritoGuard]
  },
  {
    path: 'home', component: HomeComponent,
    canActivate: [CarritoGuard]
  },
    {
    path: 'qr', component: QrVentasJadeComponent
  },
  {
    // PÚBLICA a propósito — sin AuthGuard ni CarritoGuard. Meta exige poder abrir la URL de la
    // política de privacidad sin iniciar sesión; si se topa con un redirect al login, la
    // rechaza y no deja configurar la app de Facebook.
    path: 'privacidad', component: PrivacidadComponent
  },
  {
    // PÚBLICA a propósito, mismo motivo que /privacidad — TikTok exige Terms of Service URL
    // accesible sin sesión para aprobar la app de developers.tiktok.com.
    path: 'termConditions', component: TerminosComponent
  },
  {
    // PÚBLICA a propósito — TikTok redirige aquí con el `code` de OAuth antes de que exista
    // sesión nuestra (ver TIKTOK_SETUP.md paso 3-5 y tiktok-callback.component.ts).
    path: 'tiktok/callback', component: TiktokCallbackComponent
  },
  {
    // FIX 2026-08-25: apuntaba a 'productos/buscar', que tiene AuthGuard+PantallaGuard (es el
    // catalogo interno de administracion). Cualquier visitante sin sesion que entrara al dominio
    // raiz caia directo al login en vez de ver la tienda -- rompia la tienda publica para todo
    // el mundo, y ademas hizo que TikTok rechazara el App Review ("Website URL... cannot be a
    // login page"). La tienda publica real vive en 'tienda/buscar' (ver ruta 'tienda' arriba).
    path: '', redirectTo: 'tienda/buscar', pathMatch: 'full'
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
