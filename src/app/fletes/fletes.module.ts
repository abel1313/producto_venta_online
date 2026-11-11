import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { FletesComponent } from './fletes.component';

const routes: Routes = [{ path: '', component: FletesComponent }];

@NgModule({
  declarations: [FletesComponent],
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild(routes)],
})
export class FletesModule {}
