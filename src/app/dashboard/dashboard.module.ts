import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { GraficasOperacionComponent } from './graficas-operacion/graficas-operacion.component';
import { GraficasNegocioComponent } from './graficas-negocio/graficas-negocio.component';
import { GraficasRentabilidadComponent } from './graficas-rentabilidad/graficas-rentabilidad.component';

@NgModule({
  declarations: [DashboardComponent, GraficasOperacionComponent, GraficasNegocioComponent, GraficasRentabilidadComponent],
  imports: [CommonModule, DashboardRoutingModule],
})
export class DashboardModule {}
