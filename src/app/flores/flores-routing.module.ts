import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { VitrinaFloresComponent } from './vitrina/vitrina-flores.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  // Pública — vitrina de ramos ya armados, para cualquier visitante.
  { path: 'ramos', component: VitrinaFloresComponent },
  // Admin — catálogos de configuración. El guard vive aquí, no en el módulo, porque 'ramos' es
  // pública (ver comentario en app-routing.module.ts).
  { path: 'catalogos', component: CatalogosFloresComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  { path: '', redirectTo: 'ramos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FloresRoutingModule {}
