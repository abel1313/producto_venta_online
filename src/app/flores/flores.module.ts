import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FloresRoutingModule } from './flores-routing.module';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { ConfigEntregasComponent } from './entregas/config-entregas.component';
import { VitrinaFloresComponent } from './vitrina/vitrina-flores.component';
import { GestionRamosFloresComponent } from './ramos-admin/gestion-ramos-flores.component';
import { ConfigurarRamoComponent } from './configurar/configurar-ramo.component';

// `FormsModule` es obligatorio: las pantallas usan [(ngModel)] en los formularios de alta y
// en la edición en línea. Sin él los inputs no reaccionan.
@NgModule({
  declarations: [CatalogosFloresComponent, VitrinaFloresComponent, GestionRamosFloresComponent, ConfigurarRamoComponent, ConfigEntregasComponent],
  imports: [CommonModule, FormsModule, FloresRoutingModule]
})
export class FloresModule {}
