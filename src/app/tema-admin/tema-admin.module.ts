import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionPersonalizacionComponent } from './gestion/gestion-personalizacion.component';
import { AuthGuard } from '../auth.guard';

// AdminGuardGuard (ROLE_ADMIN a secas) se quitó de aquí -- mismo hallazgo que en
// producto-routing.module.ts (2026-08-27): bloqueaba a cualquier rol no-ROLE_ADMIN sin importar
// las pantallas que le dieras desde Gestión de roles. La ruta padre "personalizacion"
// (app-routing.module.ts) ya tiene PantallaGuard.
const routes: Routes = [
  { path: '', component: GestionPersonalizacionComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [GestionPersonalizacionComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TemaAdminModule {}
