import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionLugaresComponent } from './gestion/gestion-lugares.component';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: '', component: GestionLugaresComponent, canActivate: [AdminGuardGuard] }
];

@NgModule({
  declarations: [GestionLugaresComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class LugaresEntregaModule {}
