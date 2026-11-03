import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EscanerCelularPaginaComponent } from './escaner-celular-pagina.component';

/** Página pública que abre el celular desde el QR (`/escaner/:id`). Sin sesión: la conexión se protege con su id aleatorio. */
@NgModule({
  declarations: [EscanerCelularPaginaComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: ':id', component: EscanerCelularPaginaComponent }])]
})
export class EscanerCelularModule {}
