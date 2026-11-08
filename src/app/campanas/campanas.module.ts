import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { CampanasComponent } from './campanas.component';

const routes: Routes = [{ path: '', component: CampanasComponent }];

@NgModule({
  declarations: [CampanasComponent],
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild(routes)],
})
export class CampanasModule {}
