import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from './add/add.component';
import { UpdateComponent } from './update/update.component';
import { BuscaComponent } from './busca/busca.component';
import { AuthGuard } from 'src/app/auth.guard';
import { DetalleProductoComponent } from './detalle-producto/detalle-producto.component';
import { DetalleProductosComponent } from './detalle-productos/detalle-productos.component';

// AdminGuardGuard (ROLE_ADMIN a secas) se quitó de aquí -- encontrado 2026-08-27: bloqueaba la
// navegación a CUALQUIER rol que no fuera literalmente ROLE_ADMIN, sin importar qué pantallas le
// dieras desde Gestión de roles (redirigía a /tienda/buscar antes de que el permiso nuevo
// llegara a probarse). La ruta padre "productos" (app-routing.module.ts) YA tiene PantallaGuard,
// que deja pasar a cualquiera con alguna pantalla "productos/*" -- por diseño (ver el comentario
// de PantallaGuard), las rutas hijas no necesitan su propio guard de pantalla, solo AuthGuard
// (estar logueado). Este archivo se quedó con el guard viejo cuando se migró la ruta padre.
const routes: Routes = [
  { path: 'agregar',              component: AddComponent,              canActivate: [AuthGuard] },
  { path: 'update',               component: UpdateComponent,           canActivate: [AuthGuard] },
  { path: 'buscar',               component: BuscaComponent,            canActivate: [AuthGuard] },
  { path: 'detalle-producto/:id', component: DetalleProductoComponent,  canActivate: [AuthGuard] },
  { path: 'detalle-productos',    component: DetalleProductosComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'agregar', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductoRoutingModule { }
