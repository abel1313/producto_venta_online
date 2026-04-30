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
import { VentaDirectaComponent } from './venta-directa/venta-directa.component';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';


@NgModule({
  declarations: [
    AgregarComponent,
    UpdateVarianteComponent,
    ListarVariantesComponent,
    BuscarComponent,
    VentaVarianteComponent,
    DetalleVarianteComponent,
    CargaArchivoComponent,
    VentaDirectaComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    TableModule,
    CarouselModule,
    DialogModule,
    DropdownModule,
    AgregarRoutingModule
  ]
})
export class AgregarModule { }
