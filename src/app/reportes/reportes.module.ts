import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportesRoutingModule } from './reportes-routing.module';
import { ReportesComponent } from './reportes.component';
import { CorteCajaComponent } from './corte-caja/corte-caja.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [ReportesComponent, CorteCajaComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReportesRoutingModule,
    SharedModule,
  ],
})
export class ReportesModule {}
