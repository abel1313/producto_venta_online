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
import { PantallaGuard } from '../guard/pantalla.guard';

// AdminGuardGuard se quitó de "catalogos"/"entregas"/"ramos-admin"/"frases" -- mismo hallazgo que
// en producto-routing.module.ts (2026-08-27). Las 4 tienen Submenu.ruta propio
// ("flores/catalogos", "flores/entregas", "flores/ramos-admin", "flores/frases" en
// migration_menu_submenu.sql), así que usan PantallaGuard directo.
// "zonas" se QUEDA con AdminGuardGuard -- el comentario de abajo dice que comparte pantalla con
// /lugares-entrega, pero el catálogo submenu NO tiene una fila "flores/zonas" (solo
// "lugares-entrega" a secas), así que PantallaGuard con la ruta compuesta real ("flores/zonas")
// no matchearía ninguna pantalla sembrada y bloquearía a TODOS. Pendiente: decidir si se agrega
// "flores/zonas" al catálogo o si PantallaGuard necesita un alias explícito hacia
// "lugares-entrega" para este caso.
const routes: Routes = [
  // Públicas — el cliente puede ver ramos ya armados (Flujo B) o armar el suyo desde cero
  // (Flujo A, "configurar"). Confirmar el pedido en "configurar" sí exige estar registrado, pero
  // eso lo resuelve el propio componente (mismo patrón que venta-variante), no la ruta.
  { path: 'ramos', component: VitrinaFloresComponent },
  { path: 'configurar', component: ConfigurarRamoComponent },
  // Admin — catálogos de configuración y armado de ramos. El guard vive aquí, no en el módulo,
  // porque 'ramos'/'configurar' son públicas (ver comentario en app-routing.module.ts).
  { path: 'catalogos', component: CatalogosFloresComponent, canActivate: [AuthGuard, PantallaGuard] },
  { path: 'entregas',  component: ConfigEntregasComponent,  canActivate: [AuthGuard, PantallaGuard] },
  { path: 'ramos-admin', component: GestionRamosFloresComponent, canActivate: [AuthGuard, PantallaGuard] },
  { path: 'frases', component: BandejaFrasesComponent, canActivate: [AuthGuard, PantallaGuard] },
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
