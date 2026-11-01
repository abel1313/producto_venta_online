import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { GraficasOperacionComponent } from './graficas-operacion/graficas-operacion.component';

@NgModule({
  declarations: [DashboardComponent, GraficasOperacionComponent],
  imports: [CommonModule, DashboardRoutingModule],
})
export class DashboardModule {}
