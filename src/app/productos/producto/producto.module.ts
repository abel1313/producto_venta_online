import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductoRoutingModule } from './producto-routing.module';
import { AddComponent } from './add/add.component';
import { AllComponent } from './all/all.component';


@NgModule({
  declarations: [
    AddComponent,
    AllComponent
  ],
  imports: [
    CommonModule,
    ProductoRoutingModule
  ]
})
export class ProductoModule { }
