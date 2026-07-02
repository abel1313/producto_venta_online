import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportesRoutingModule } from './reportes-routing.module';
import { ReportesComponent } from './reportes.component';

@NgModule({
  declarations: [ReportesComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReportesRoutingModule,
  ],
})
export class ReportesModule {}
