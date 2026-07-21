import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';
import { CargaImagenesComponent } from './carga-imagenes.component';

// Herramienta de captura de catálogo — solo admin.
// El back ya responde 403 a quien no lo sea, pero la ruta también se bloquea aquí:
// que el request final falle no debe ser la única barrera.
const routes: Routes = [
  { path: '', component: CargaImagenesComponent, canActivate: [AuthGuard, AdminGuardGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CargaImagenesRoutingModule {}
