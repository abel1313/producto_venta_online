import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from './add/add.component';
import { AllComponent } from './all/all.component';
import { UpdateComponent } from './update/update.component';
import { BuscaComponent } from './busca/busca.component';

const routes: Routes = [

  {
    path: 'agregar', component: AddComponent
  },
  {
    path: 'update', component: UpdateComponent
  },
  {
    path: 'buscar', component: BuscaComponent
  },
  {
    path: '' ,redirectTo: 'agregar', pathMatch:'full' ,
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductoRoutingModule { }
