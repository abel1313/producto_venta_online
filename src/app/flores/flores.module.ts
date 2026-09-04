import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloresRoutingModule } from './flores-routing.module';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { ConfigEntregasComponent } from './entregas/config-entregas.component';
import { VitrinaFloresComponent } from './vitrina/vitrina-flores.component';
import { GestionRamosFloresComponent } from './ramos-admin/gestion-ramos-flores.component';
import { ConfigurarRamoComponent } from './configurar/configurar-ramo.component';
import { BandejaFrasesComponent } from './frases/bandeja-frases.component';
import { SharedModule } from '../shared/shared.module';

// `FormsModule` es obligatorio: las pantallas usan [(ngModel)] en los formularios de alta y
// en la edición en línea. Sin él los inputs no reaccionan.
// `SharedModule` trae `<app-selector-ubicacion>` (mapa de ubicación exacta), usado en
// "Arma tu ramo" al elegir zona de entrega.
@NgModule({
  declarations: [CatalogosFloresComponent, VitrinaFloresComponent, GestionRamosFloresComponent, ConfigurarRamoComponent, ConfigEntregasComponent, BandejaFrasesComponent],
  imports: [CommonModule, FormsModule, FloresRoutingModule, SharedModule]
})
export class FloresModule {}
