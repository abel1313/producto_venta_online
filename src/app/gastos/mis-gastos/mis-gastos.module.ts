
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MisGastosRoutingModule } from './mis-gastos-routing.module';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';
import { AgGridModule } from 'ag-grid-angular';
import { MatMenuModule } from '@angular/material/menu';
import { AllComponent } from '../all/all.component';


@NgModule({
  declarations: [
    AddComponent,
    BuscarComponent,
    AllComponent
  ],
  imports: [
    CommonModule,
    MisGastosRoutingModule,
    ReactiveFormsModule,
    AgGridModule,
    MatMenuModule,
    
  ]
})
export class MisGastosModule { }
