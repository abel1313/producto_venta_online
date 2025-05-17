import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RifasRoutingModule } from './rifas-routing.module';
import { AgregarRifaComponent } from './agregar-rifa/agregar-rifa.component';
import { BuscarRifaComponent } from './buscar-rifa/buscar-rifa.component';
import { MostrarRifasComponent } from './mostrar-rifas/mostrar-rifas.component';
import { ClietesModule } from '../clietes/clietes.module';


@NgModule({
  declarations: [
    AgregarRifaComponent,
    BuscarRifaComponent,
    MostrarRifasComponent
  ],
  imports: [
    CommonModule,
    RifasRoutingModule,
    ClietesModule
  ]
})
export class RifasModule { }
