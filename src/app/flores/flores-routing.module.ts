import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogosFloresComponent } from './catalogos/catalogos-flores.component';
import { ConfigEntregasComponent } from './entregas/config-entregas.component';
import { VitrinaFloresComponent } from './vitrina/vitrina-flores.component';
import { GestionRamosFloresComponent } from './ramos-admin/gestion-ramos-flores.component';
import { ConfigurarRamoComponent } from './configurar/configurar-ramo.component';
import { BandejaFrasesComponent } from './frases/bandeja-frases.component';
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
  { path: 'entregas',  component: ConfigEntregasComponent,  canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'ramos-admin', component: GestionRamosFloresComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  { path: 'frases', component: BandejaFrasesComponent, canActivate: [AuthGuard, AdminGuardGuard] },
  /**
   * Misma pantalla que `/lugares-entrega` (Inventario), con su propia dirección.
   *
   * El catálogo de zonas se usa desde los dos menús, pero el sidebar resuelve el grupo activo
   * por la URL: con una sola ruta compartida, entrar desde Flores dejaba el acordeón abierto en
   * Inventario. Con una dirección propia, cada menú se queda donde el usuario lo dejó.
   *
   * Carga el mismo módulo — no se duplica la pantalla, solo el punto de entrada.
   */
  {
    path: 'zonas',
    loadChildren: () => import('../lugares-entrega/lugares-entrega.module').then(m => m.LugaresEntregaModule),
    canActivate: [AuthGuard, AdminGuardGuard]
  },
  { path: '', redirectTo: 'ramos', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FloresRoutingModule {}
