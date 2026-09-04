import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { EntregasZonaComponent } from './entregas-zona.component';
import { AuthGuard } from '../auth.guard';
import { SharedModule } from '../shared/shared.module';

const routes: Routes = [
  { path: '', component: EntregasZonaComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [EntregasZonaComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class EntregasZonaModule {}
