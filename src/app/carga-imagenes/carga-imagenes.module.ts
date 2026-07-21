import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CargaImagenesRoutingModule } from './carga-imagenes-routing.module';
import { CargaImagenesComponent } from './carga-imagenes.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [CargaImagenesComponent],
  imports: [
    CommonModule,
    FormsModule,
    CargaImagenesRoutingModule,
    SharedModule
  ]
})
export class CargaImagenesModule {}
