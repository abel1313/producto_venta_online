import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from './add/add.component';
import { AllComponent } from './all/all.component';

const routes: Routes = [

  {
    path: 'agregar', component: AddComponent
  },
  {
    path: 'lista', component: AllComponent
  },
  {
    path: '' ,redirectTo: 'lista', pathMatch:'full' ,
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductoRoutingModule { }
