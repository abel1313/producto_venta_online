import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { OlvidePasswordComponent } from './olvide-password/olvide-password.component';

const routes: Routes = [
  { path: '',                component: LoginFormComponent },
  { path: 'olvide-password', component: OlvidePasswordComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
