import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginFormComponent } from './login-form/login-form.component';
import { OlvidePasswordComponent } from './olvide-password/olvide-password.component';
import { LoginRoutingModule } from './login-routing.module';


@NgModule({
  declarations: [
    LoginFormComponent,
    OlvidePasswordComponent
  ],
  imports: [
    CommonModule,
    LoginRoutingModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class LoginModule { }
