import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MisGastosRoutingModule } from './mis-gastos-routing.module';
import { AddComponent } from '../add/add.component';
import { BuscarComponent } from '../buscar/buscar.component';
import { AllComponent } from '../all/all.component';

@NgModule({
  declarations: [AddComponent, BuscarComponent, AllComponent],
  imports: [CommonModule, MisGastosRoutingModule, FormsModule, ReactiveFormsModule]
})
export class MisGastosModule {}
