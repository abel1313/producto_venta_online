import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UsuariosRoutingModule } from './usuarios-routing.module';
import { AddUsuariosComponent } from './add-usuarios/add-usuarios.component';
import { AllUsuariosComponent } from './all-usuarios/all-usuarios.component';
import { BuscarUsuariosComponent } from './buscar-usuarios/buscar-usuarios.component';
import { ActualizarUsuariosComponent } from './actualizar-usuarios/actualizar-usuarios.component';
import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    AddUsuariosComponent,
    AllUsuariosComponent,
    BuscarUsuariosComponent,
    ActualizarUsuariosComponent
  ],
  imports: [
    CommonModule,
    UsuariosRoutingModule,
    ReactiveFormsModule,
  ]
})
export class UsuariosModule { }
