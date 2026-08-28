import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisDatosComponent } from './mis-datos/mis-datos.component';
import { ClientesAddComponent } from './clientes-add/clientes-add.component';
import { ClientesBuscarComponent } from './clientes-buscar/clientes-buscar.component';
import { CambiarPasswordComponent } from './cambiar-password/cambiar-password.component';
import { MiPerfilComponent } from './mi-perfil/mi-perfil.component';
import { AgregarCompraComponent } from './agregar-compra/agregar-compra.component';
import { AuthGuard } from '../auth.guard';
import { PantallaGuard } from '../guard/pantalla.guard';

// AdminGuardGuard se quitó de "buscar" -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27), pero este módulo mezcla rutas de cliente (agregar, mis-datos, etc., que se
// quedan solo con AuthGuard) con la de administración ("buscar" -> ClientesBuscarComponent), así
// que no se le pudo poner PantallaGuard al módulo completo como a los demás. "buscar" usa
// PantallaGuard directo, que ahora arma la ruta completa "clientes/buscar" (ver comentario en
// pantalla.guard.ts) y coincide con el Submenu.ruta sembrado en migration_menu_submenu.sql.
const routes: Routes = [
  { path: 'agregar',           component: ClientesAddComponent,      canActivate: [AuthGuard] },
  { path: 'mis-datos',         component: MisDatosComponent,         canActivate: [AuthGuard] },
  { path: 'cambiar-password',  component: CambiarPasswordComponent,  canActivate: [AuthGuard] },
  { path: 'mi-perfil',         component: MiPerfilComponent,         canActivate: [AuthGuard] },
  { path: 'agregar-compra',    component: AgregarCompraComponent,    canActivate: [AuthGuard] },
  { path: 'buscar',            component: ClientesBuscarComponent,   canActivate: [AuthGuard, PantallaGuard] },
  { path: '', redirectTo: 'agregar', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClietesRoutingModule { }
