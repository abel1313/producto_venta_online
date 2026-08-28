import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionLugaresComponent } from './gestion/gestion-lugares.component';
import { AnillosEditorComponent } from './anillos-editor/anillos-editor.component';
import { AuthGuard } from '../auth.guard';
import { SharedModule } from '../shared/shared.module';

// AdminGuardGuard se quitó de aquí -- mismo hallazgo que en producto-routing.module.ts
// (2026-08-27). La ruta padre "lugares-entrega" (app-routing.module.ts) ya tiene PantallaGuard.
const routes: Routes = [
  { path: '', component: GestionLugaresComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [GestionLugaresComponent, AnillosEditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class LugaresEntregaModule {}
