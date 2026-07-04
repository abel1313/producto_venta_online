import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { OlvidePasswordComponent } from './olvide-password/olvide-password.component';
import { VerificarCorreoComponent } from './verificar-correo/verificar-correo.component';

const routes: Routes = [
  { path: '',                 component: LoginFormComponent },
  { path: 'olvide-password',  component: OlvidePasswordComponent },
  { path: 'verificar-correo', component: VerificarCorreoComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
