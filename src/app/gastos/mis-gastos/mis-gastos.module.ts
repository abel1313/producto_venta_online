
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MisGastosRoutingModule } from './mis-gastos-routing.module';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';


@NgModule({
  declarations: [
    AddComponent,
    BuscarComponent
  ],
  imports: [
    CommonModule,
    MisGastosRoutingModule,
    ReactiveFormsModule
    
  ]
})
export class MisGastosModule { }
