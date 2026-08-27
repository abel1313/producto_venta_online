import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionPersonalizacionComponent } from './gestion/gestion-personalizacion.component';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: '', component: GestionPersonalizacionComponent, canActivate: [AdminGuardGuard] }
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
