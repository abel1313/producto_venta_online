import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VentaProductoRoutingModule } from './venta-producto-routing.module';
import { AddVentaComponent } from './add-venta/add-venta.component';
import { BuscarVentaComponent } from './buscar-venta/buscar-venta.component';
import { AllVentaComponent } from './all-venta/all-venta.component';
import { ProductoModule } from 'src/app/productos/producto/producto.module';


@NgModule({
  declarations: [
    AddVentaComponent,
    BuscarVentaComponent,
    AllVentaComponent,
  ],
  imports: [
    CommonModule,
    VentaProductoRoutingModule,
    ProductoModule
  ]
})
export class VentaProductoModule { }
