import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromocionesRoutingModule } from './promociones-routing.module';
import { PromocionesComponent } from './promociones.component';

@NgModule({
  declarations: [PromocionesComponent],
  imports: [
    CommonModule,
    FormsModule,
    PromocionesRoutingModule
  ]
})
export class PromocionesModule {}
