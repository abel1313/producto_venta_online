import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AgregarRoutingModule } from './agregar-routing.module';
import { AgregarComponent } from './agregar/agregar.component';
import { UpdateVarianteComponent } from './update-variante/update-variante.component';
import { ListarVariantesComponent } from './listar-variantes/listar-variantes.component';
import { BuscarComponent } from './buscar/buscar.component';


@NgModule({
  declarations: [
    AgregarComponent,
    UpdateVarianteComponent,
    ListarVariantesComponent,
    BuscarComponent
  ],
  imports: [
    CommonModule,
    AgregarRoutingModule
  ]
})
export class AgregarModule { }
