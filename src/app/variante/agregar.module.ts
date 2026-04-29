import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { TableModule } from 'primeng/table';

import { AgregarRoutingModule } from './agregar-routing.module';
import { AgregarComponent } from './agregar/agregar.component';
import { UpdateVarianteComponent } from './update-variante/update-variante.component';
import { ListarVariantesComponent } from './listar-variantes/listar-variantes.component';
import { BuscarComponent } from './buscar/buscar.component';
import { VentaVarianteComponent } from './venta-variante/venta-variante.component';
import { DetalleVarianteComponent } from './detalle-variante/detalle-variante.component';
import { CargaArchivoComponent } from '../documentos/carga-archivo/carga-archivo.component';
import { CarouselModule } from 'primeng/carousel';


@NgModule({
  declarations: [
    AgregarComponent,
    UpdateVarianteComponent,
    ListarVariantesComponent,
    BuscarComponent,
    VentaVarianteComponent,
    DetalleVarianteComponent,
    CargaArchivoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    TableModule,
    CarouselModule,
    AgregarRoutingModule
  ]
})
export class AgregarModule { }
