import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VentaProductoRoutingModule } from './venta-producto-routing.module';
import { AddVentaComponent } from './add-venta/add-venta.component';
import { MaskCellRendererComponent } from './add-venta/mask-cell-renderer.component';
import { BuscarVentaComponent } from './buscar-venta/buscar-venta.component';
import { AllVentaComponent } from './all-venta/all-venta.component';
import { ProductoModule } from 'src/app/productos/producto/producto.module';
import { TableGenericoModule } from 'src/app/tablas/table-generico/table-generico.module';
import { AgGridModule } from 'ag-grid-angular';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BuscarGenericoComponent } from 'src/app/buscador/buscar-generico/buscar-generico.component';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';


@NgModule({
  declarations: [
    AddVentaComponent,
    BuscarVentaComponent,
    AllVentaComponent,
    BuscarGenericoComponent,
    MaskCellRendererComponent
  ],
  imports: [
    CommonModule,
    VentaProductoRoutingModule,
    ProductoModule,
    TableGenericoModule,
        AgGridModule,
        MatMenuModule,
        MatButtonModule,
        HttpClientModule,
        FormsModule,
        DialogModule,
        DropdownModule,
  ]
})
export class VentaProductoModule { }
