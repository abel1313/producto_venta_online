import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableGenericoComponent } from './table-generico.component';
import { AgGridModule } from 'ag-grid-angular';
import { MatMenuModule } from '@angular/material/menu';



@NgModule({
  declarations: [
    TableGenericoComponent
  ],
  imports: [
    CommonModule,
    AgGridModule,
    MatMenuModule,
  ],
  exports:[
    TableGenericoComponent
  ]
})
export class TableGenericoModule { }
