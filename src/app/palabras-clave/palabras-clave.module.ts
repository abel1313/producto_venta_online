import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionPalabrasClave } from './gestion/gestion-palabras-clave.component';
import { AuthGuard } from '../auth.guard';

// AdminGuardGuard se quitó de aquí -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27). La ruta padre "palabras-clave" (app-routing.module.ts) ya tiene PantallaGuard.
const routes: Routes = [
  { path: '', component: GestionPalabrasClave, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [GestionPalabrasClave],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class PalabrasClave {}
