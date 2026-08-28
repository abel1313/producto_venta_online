import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionMenuComponent } from './gestion/gestion-menu.component';
import { GestionRolesComponent } from './gestion-roles/gestion-roles.component';
import { AuthGuard } from '../auth.guard';

// AdminGuardGuard (ROLE_ADMIN a secas) se quitó de aquí -- mismo hallazgo que en
// producto-routing.module.ts (2026-08-27). La ruta padre "gestion-menu" (app-routing.module.ts)
// ya tiene PantallaGuard. Nota: alguien con SOLO "gestion-menu" (no "gestion-menu/roles") podría
// navegar a /gestion-menu/roles, pero las llamadas reales (GET/POST/DELETE /v1/roles/**) siguen
// exigiendo la pantalla "gestion-menu/roles" específica en el backend (SecurityConfig) -- el
// peor caso es una pantalla en blanco por 403, no una brecha de seguridad real.
const routes: Routes = [
  { path: '', component: GestionMenuComponent, canActivate: [AuthGuard] },
  { path: 'roles', component: GestionRolesComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [GestionMenuComponent, GestionRolesComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class MenuAdminModule {}
