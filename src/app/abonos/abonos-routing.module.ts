import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuardGuard } from '../guard/admin-guard.guard';
import { AuthGuard } from '../auth.guard';
import { AbonosComponent } from './abonos.component';

const routes: Routes = [
  { path: '', component: AbonosComponent, canActivate: [AuthGuard, AdminGuardGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AbonosRoutingModule {}
