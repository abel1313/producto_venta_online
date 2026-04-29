import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { CacheComponent } from './cache/cache.component';
import { ConfigNegocioComponent } from './config-negocio/config-negocio.component';
import { PresentacionImagenesComponent } from './presentacion-imagenes/presentacion-imagenes.component';

@NgModule({
  declarations: [
    CacheComponent,
    ConfigNegocioComponent,
    PresentacionImagenesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule
  ]
})
export class AdminModule {}
