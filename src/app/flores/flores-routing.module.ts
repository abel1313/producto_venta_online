import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { VitrinaFloresComponent } from './vitrina/vitrina-flores.component';
import { GestionRamosFloresComponent } from './ramos-admin/gestion-ramos-flores.component';
import { ConfigurarRamoComponent } from './configurar/configurar-ramo.component';
import { AuthGuard } from '../auth.guard';
import { AdminGuardGuard } from '../guard/admin-guard.guard';

const routes: Routes = [
  // Públicas — el cliente puede ver ramos ya armados (Flujo B) o armar el suyo desde cero
  // (Flujo A, "configurar"). Confirmar el pedido en "configurar" sí exige estar registrado, pero
  // eso lo resuelve el propio componente (mismo patrón que venta-variante), no la ruta.
  { path: 'ramos', component: VitrinaFloresComponent },
  { path: 'configurar', component: ConfigurarRamoComponent },
  // Admin — catálogos de configuración y armado de ramos. El guard vive aquí, no en el módulo,
  // porque 'ramos'/'configurar' son públicas (ver comentario en app-routing.module.ts).
  { path: 'catalogos', component: CatalogosFloresComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'ramos-admin', component: GestionRamosFloresComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  { path: '', redirectTo: 'ramos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FloresRoutingModule {}
