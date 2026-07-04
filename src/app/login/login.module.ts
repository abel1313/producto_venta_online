import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { OlvidePasswordComponent } from './olvide-password/olvide-password.component';
import { VerificarCorreoComponent } from './verificar-correo/verificar-correo.component';
import { LoginRoutingModule } from './login-routing.module';


@NgModule({
  declarations: [
    LoginFormComponent,
    OlvidePasswordComponent,
    VerificarCorreoComponent
  ],
  imports: [
    CommonModule,
    LoginRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ]
})
export class LoginModule { }
