import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  { path: 'catalogos', component: CatalogosFloresComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  { path: '', redirectTo: 'catalogos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FloresRoutingModule {}
