import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridModule } from 'ag-grid-angular';
import { MatTableModule } from '@angular/material/table';
import { TableModule } from 'primeng/table';
import { DemoTablasComponent } from './demo-tablas.component';

@NgModule({
  declarations: [
    DemoTablasComponent
  ],
  imports: [
    CommonModule,
    AgGridModule,
    MatTableModule,
    TableModule
  ]
})
export class DemoTablasModule { }
