import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CacheComponent } from './cache/cache.component';
import { ConfigNegocioComponent } from './config-negocio/config-negocio.component';
import { PresentacionImagenesComponent } from './presentacion-imagenes/presentacion-imagenes.component';
import { DiagnosticoImagenesComponent } from './diagnostico-imagenes/diagnostico-imagenes.component';
import { ReconciliacionImagenesComponent } from './reconciliacion-imagenes/reconciliacion-imagenes.component';
import { ChatAdminComponent } from './chat-admin/chat-admin.component';

const routes: Routes = [
  { path: 'cache',                   component: CacheComponent },
  { path: 'negocio',                 component: ConfigNegocioComponent },
  { path: 'presentacion',            component: PresentacionImagenesComponent },
  { path: 'diagnostico-imagenes',    component: DiagnosticoImagenesComponent },
  { path: 'reconciliacion-imagenes', component: ReconciliacionImagenesComponent },
  { path: 'chat',                    component: ChatAdminComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
