import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CacheComponent } from './cache/cache.component';
import { ConfigNegocioComponent } from './config-negocio/config-negocio.component';
import { PresentacionImagenesComponent } from './presentacion-imagenes/presentacion-imagenes.component';
import { DiagnosticoImagenesComponent } from './diagnostico-imagenes/diagnostico-imagenes.component';
import { ReconciliacionImagenesComponent } from './reconciliacion-imagenes/reconciliacion-imagenes.component';

const routes: Routes = [
  { path: 'cache',                   component: CacheComponent },
  { path: 'negocio',                 component: ConfigNegocioComponent },
  { path: 'presentacion',            component: PresentacionImagenesComponent },
  { path: 'diagnostico-imagenes',    component: DiagnosticoImagenesComponent },
  { path: 'reconciliacion-imagenes', component: ReconciliacionImagenesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
