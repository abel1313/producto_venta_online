import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { CacheComponent } from './cache/cache.component';
import { ConfigNegocioComponent } from './config-negocio/config-negocio.component';
import { PresentacionImagenesComponent } from './presentacion-imagenes/presentacion-imagenes.component';
import { DiagnosticoImagenesComponent } from './diagnostico-imagenes/diagnostico-imagenes.component';
import { ReconciliacionImagenesComponent } from './reconciliacion-imagenes/reconciliacion-imagenes.component';
import { ChatAdminComponent } from './chat-admin/chat-admin.component';
import { GestionPromocionesComponent } from './promociones/gestion-promociones.component';
import { GestionTickerComponent } from './ticker/gestion-ticker.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    CacheComponent,
    ConfigNegocioComponent,
    PresentacionImagenesComponent,
    DiagnosticoImagenesComponent,
    ReconciliacionImagenesComponent,
    ChatAdminComponent,
    GestionPromocionesComponent,
    GestionTickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    SharedModule
  ]
})
export class AdminModule {}
