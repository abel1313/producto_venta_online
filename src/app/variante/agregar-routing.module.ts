import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AgregarComponent } from './agregar/agregar.component';
import { UpdateVarianteComponent } from './update-variante/update-variante.component';
import { BuscarComponent } from './buscar/buscar.component';
import { VentaVarianteComponent } from './venta-variante/venta-variante.component';
import { DetalleVarianteComponent } from './detalle-variante/detalle-variante.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';
import { PantallaGuard } from '../guard/pantalla.guard';
import { CargaArchivoComponent } from '../documentos/carga-archivo/carga-archivo.component';
import { VentaDirectaComponent } from './venta-directa/venta-directa.component';

// AdminGuardGuard se quitó de "venta", "cargar-excel" y "venta-directa" -- mismo hallazgo que en
// producto-routing.module.ts (2026-08-27). Tienen Submenu.ruta propio en
// migration_menu_submenu.sql ("tienda/venta", "tienda/cargar-excel", "tienda/venta-directa"),
// así que usan PantallaGuard directo.
// "update" (editar variante) se QUEDA con AdminGuardGuard -- no tiene fila propia en el catálogo
// submenu (no está en el menú, se llega por un botón "editar" desde "buscar"/"venta"), así que
// ponerle PantallaGuard bloquearía a TODOS -- incluido ROLE_ADMIN -- hasta que se agregue esa
// pantalla desde Gestión de menú. Pendiente: crear el submenu "tienda/update" (o decidir que
// comparte pantalla con "tienda/venta") antes de migrarlo.
const routes: Routes = [
  { path: 'buscar',                component: BuscarComponent },
  { path: 'venta',                 component: AgregarComponent,         canActivate: [AuthGuard, PantallaGuard] },
  { path: 'update',                component: UpdateVarianteComponent,  canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'carrito',               component: VentaVarianteComponent },
  { path: 'detalle/:id',           component: DetalleVarianteComponent },
  { path: 'detalle/producto/:productoId', component: DetalleVarianteComponent },
  { path: 'cargar-excel',   component: CargaArchivoComponent,  canActivate: [AuthGuard, PantallaGuard] },
  { path: 'venta-directa', component: VentaDirectaComponent,  canActivate: [AuthGuard, PantallaGuard] },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgregarRoutingModule { }
