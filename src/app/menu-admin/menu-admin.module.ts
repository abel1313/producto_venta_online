import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionMenuComponent } from './gestion/gestion-menu.component';
import { GestionRolesComponent } from './gestion-roles/gestion-roles.component';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: '', component: GestionMenuComponent, canActivate: [AdminGuardGuard] },
  { path: 'roles', component: GestionRolesComponent, canActivate: [AdminGuardGuard] }
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
