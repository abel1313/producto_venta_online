import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CacheComponent } from './cache/cache.component';

const routes: Routes = [
  { path: 'cache', component: CacheComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
