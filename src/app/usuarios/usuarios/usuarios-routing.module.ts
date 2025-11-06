import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/auth.guard';
import { AddUsuariosComponent } from './add-usuarios/add-usuarios.component';
import { ActualizarUsuariosComponent } from './actualizar-usuarios/actualizar-usuarios.component';
import { AllUsuariosComponent } from './all-usuarios/all-usuarios.component';
import { AdminGuardGuard } from 'src/app/guard/admin-guard.guard';
import { UsuariosGuard } from 'src/app/auth/usuarios.guard';

const routes: Routes = [
  {
    path: 'registrar', component: AddUsuariosComponent, canActivate: [UsuariosGuard]
  },
  {
    path: 'update', component: ActualizarUsuariosComponent, canActivate:[AdminGuardGuard, AuthGuard]
  },
  {
    path: 'buscar', component: AllUsuariosComponent, canActivate:[AdminGuardGuard, AuthGuard]
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
