import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/auth.guard';
import { AddUsuariosComponent } from './add-usuarios/add-usuarios.component';
import { ActualizarUsuariosComponent } from './actualizar-usuarios/actualizar-usuarios.component';
import { AllUsuariosComponent } from './all-usuarios/all-usuarios.component';
import { AdminGuardGuard } from 'src/app/guard/admin-guard.guard';
import { PantallaGuard } from 'src/app/guard/pantalla.guard';
import { UsuariosGuard } from 'src/app/auth/usuarios.guard';

// AdminGuardGuard se quitó de "buscar" -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27). "buscar" tiene Submenu.ruta propio ("usuarios/buscar" en
// migration_menu_submenu.sql), así que usa PantallaGuard directo.
// "update" se QUEDA con AdminGuardGuard -- no tiene fila propia en el catálogo submenu (se llega
// por un botón "editar" desde "buscar", no está en el menú), así que ponerle PantallaGuard
// bloquearía a TODOS -- incluido ROLE_ADMIN -- hasta que se agregue esa pantalla desde Gestión
// de menú. Pendiente: crear el submenu "usuarios/update" (o decidir que comparte pantalla con
// "usuarios/buscar") antes de migrarlo.
const routes: Routes = [
  {
    path: 'registrar', component: AddUsuariosComponent, canActivate: [UsuariosGuard]
  },
  {
    path: 'update', component: ActualizarUsuariosComponent, canActivate:[AdminGuardGuard, AuthGuard]
  },
  {
    path: 'buscar', component: AllUsuariosComponent, canActivate:[PantallaGuard, AuthGuard]
  },
  {
    path: '', redirectTo: 'agregar', pathMatch: 'full',
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsuariosRoutingModule { }
