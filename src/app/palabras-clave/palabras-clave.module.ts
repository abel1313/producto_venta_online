import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionPalabrasClave } from './gestion/gestion-palabras-clave.component';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: '', component: GestionPalabrasClave, canActivate: [AdminGuardGuard] }
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
