import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../auth.guard';
import { AbonosComponent } from './abonos.component';

// AdminGuardGuard se quitó de aquí -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27). La ruta padre "abonos" (app-routing.module.ts) ya tiene PantallaGuard.
const routes: Routes = [
  { path: '', component: AbonosComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AbonosRoutingModule {}
