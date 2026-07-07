import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UsuariosRoutingModule } from './usuarios-routing.module';
import { AddUsuariosComponent } from './add-usuarios/add-usuarios.component';
import { AllUsuariosComponent } from './all-usuarios/all-usuarios.component';
import { BuscarUsuariosComponent } from './buscar-usuarios/buscar-usuarios.component';
import { ActualizarUsuariosComponent } from './actualizar-usuarios/actualizar-usuarios.component';
import { ReactiveFormsModule } from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {  RadioButtonModule } from 'primeng/radiobutton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    NzSwitchModule,
    SharedModule
  ]
})
export class UsuariosModule { }
