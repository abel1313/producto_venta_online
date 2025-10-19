import { NzButtonModule } from 'ng-zorro-antd/button';
import { ButtonModule } from 'primeng/button';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductoRoutingModule } from './producto-routing.module';
import { AddComponent } from './add/add.component';
import { AllComponent } from './all/all.component';
import { ReactiveFormsModule } from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import { BuscaComponent } from './busca/busca.component';
import { UpdateComponent } from './update/update.component';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { MatMenuModule } from '@angular/material/menu';
import { AgGridModule } from 'ag-grid-angular';
import { HttpClientModule } from '@angular/common/http';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import { DetalleProductoComponent } from './detalle-producto/detalle-producto.component';
import { NbCardModule, NbStepperModule } from '@nebular/theme';
import { CarouselModule } from 'primeng/carousel';
import { TagModule } from 'primeng/tag';
import { DetalleProductosComponent } from './detalle-productos/detalle-productos.component';
import { TableModule } from 'primeng/table';
@NgModule({
  declarations: [
    AddComponent,
    AllComponent,
    BuscaComponent,
    UpdateComponent,
    DetalleProductoComponent,
    DetalleProductosComponent
  ],
  imports: [
    CommonModule,
    ProductoRoutingModule,
    ReactiveFormsModule,
    AgGridModule,
    MatMenuModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    NbCardModule,
    NbStepperModule,
    ButtonModule,
    NzButtonModule,
    CarouselModule,
    TagModule,
    TableModule
  ],
  exports:[
    AllComponent,
    BuscaComponent,
  ]
})
export class ProductoModule { }
