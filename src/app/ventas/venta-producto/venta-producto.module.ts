import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VentaProductoRoutingModule } from './venta-producto-routing.module';
import { AddVentaComponent } from './add-venta/add-venta.component';
import { BuscarVentaComponent } from './buscar-venta/buscar-venta.component';
import { AllVentaComponent } from './all-venta/all-venta.component';
import { ProductoModule } from 'src/app/productos/producto/producto.module';
import { TableGenericoModule } from 'src/app/tablas/table-generico/table-generico.module';
import { AgGridModule } from 'ag-grid-angular';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BuscarGenericoComponent } from 'src/app/buscador/buscar-generico/buscar-generico.component';


@NgModule({
  declarations: [
    AddVentaComponent,
    BuscarVentaComponent,
    AllVentaComponent,
    BuscarGenericoComponent
  ],
  imports: [
    CommonModule,
    VentaProductoRoutingModule,
    ProductoModule,
    TableGenericoModule,
        AgGridModule,
        MatMenuModule,
        HttpClientModule,
        FormsModule,
        
  ]
})
export class VentaProductoModule { }
