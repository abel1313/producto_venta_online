import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { TableModule } from 'primeng/table';
import { DemoTablasComponent } from './demo-tablas.component';

@NgModule({
  declarations: [
    DemoTablasComponent
  ],
  imports: [
    CommonModule,
    MatTableModule,
    TableModule
  ]
})
export class DemoTablasModule { }
