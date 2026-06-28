import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AbonosRoutingModule } from './abonos-routing.module';
import { AbonosComponent } from './abonos.component';

@NgModule({
  declarations: [AbonosComponent],
  imports: [
    CommonModule,
    FormsModule,
    AbonosRoutingModule,
  ]
})
export class AbonosModule {}
