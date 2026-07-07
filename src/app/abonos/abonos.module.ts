import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AbonosRoutingModule } from './abonos-routing.module';
import { AbonosComponent } from './abonos.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [AbonosComponent],
  imports: [
    CommonModule,
    FormsModule,
    AbonosRoutingModule,
    SharedModule
  ]
})
export class AbonosModule {}
