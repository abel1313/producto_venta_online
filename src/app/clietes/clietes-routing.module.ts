import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { ClientesBuscarComponent } from './clientes-buscar/clientes-buscar.component';
import { CambiarPasswordComponent } from './cambiar-password/cambiar-password.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: 'agregar',           component: ClientesAddComponent,      canActivate: [AuthGuard] },
  { path: 'mis-datos',         component: MisDatosComponent,         canActivate: [AuthGuard] },
  { path: 'cambiar-password',  component: CambiarPasswordComponent,  canActivate: [AuthGuard] },
  { path: 'mi-perfil',         component: MiPerfilComponent,         canActivate: [AuthGuard] },
  { path: 'buscar',            component: ClientesBuscarComponent,   canActivate: [AuthGuard, AdminGuardGuard] },
  { path: '', redirectTo: 'agregar', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClietesRoutingModule { }
