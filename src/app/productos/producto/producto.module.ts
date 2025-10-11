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
import {ChangeDetectionStrategy} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';

@NgModule({
  declarations: [
    AddComponent,
    AllComponent,
    BuscaComponent,
    UpdateComponent
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
  ],
  exports:[
    AllComponent,
    BuscaComponent,
  ]
})
export class ProductoModule { }
