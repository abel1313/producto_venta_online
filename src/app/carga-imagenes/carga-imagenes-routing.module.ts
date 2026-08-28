import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../auth.guard';
import { CargaImagenesComponent } from './carga-imagenes.component';

// AdminGuardGuard (ROLE_ADMIN a secas) se quitó de aquí -- mismo hallazgo que en
// producto-routing.module.ts (2026-08-27): bloqueaba a cualquier rol no-ROLE_ADMIN sin importar
// las pantallas que le dieras desde Gestión de roles. La ruta padre "carga-imagenes"
// (app-routing.module.ts) ya tiene PantallaGuard, y el back sigue exigiendo la pantalla
// "carga-imagenes" en cada request real (esa es la barrera de verdad).
const routes: Routes = [
  { path: '', component: CargaImagenesComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CargaImagenesRoutingModule {}
