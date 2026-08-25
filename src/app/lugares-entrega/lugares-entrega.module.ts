import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { GestionLugaresComponent } from './gestion/gestion-lugares.component';
import { AnillosEditorComponent } from './anillos-editor/anillos-editor.component';
import { AdminGuardGuard } from '../guard/admin-guard.guard';
import { SharedModule } from '../shared/shared.module';

const routes: Routes = [
  { path: '', component: GestionLugaresComponent, canActivate: [AdminGuardGuard] }
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
