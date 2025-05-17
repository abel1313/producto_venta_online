import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClietesRoutingModule } from './clietes-routing.module';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { ClientesBuscarComponent } from './clientes-buscar/clientes-buscar.component';
import { ClientesMostrarComponent } from './clientes-mostrar/clientes-mostrar.component';
import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent
  ],
  imports: [
    CommonModule,
    ClietesRoutingModule,
    ReactiveFormsModule
  ],
  exports:[
        ClientesAddComponent,
    ClientesBuscarComponent,
    ClientesMostrarComponent
  ]
})
export class ClietesModule { }
