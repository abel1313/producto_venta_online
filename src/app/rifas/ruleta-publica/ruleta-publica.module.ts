import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RuletaPublicaComponent } from './ruleta-publica.component';

// Módulo aparte a propósito: esta vista vive FUERA del AuthGuard (cualquiera con el
// link la abre) y por eso no comparte routing con RifasModule, que sí está protegido.
const routes: Routes = [
  { path: ':rifaId', component: RuletaPublicaComponent }
];

@NgModule({
  declarations: [RuletaPublicaComponent],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class RuletaPublicaModule { }
