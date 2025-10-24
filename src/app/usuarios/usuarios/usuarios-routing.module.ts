import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/auth.guard';
import { AddUsuariosComponent } from './add-usuarios/add-usuarios.component';
import { ActualizarUsuariosComponent } from './actualizar-usuarios/actualizar-usuarios.component';
import { AllUsuariosComponent } from './all-usuarios/all-usuarios.component';

const routes: Routes = [
  {
    path: 'registrar', component: AddUsuariosComponent
  },
  {
    path: 'update', component: ActualizarUsuariosComponent
  },
  {
    path: 'buscar', component: AllUsuariosComponent
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
