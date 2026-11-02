import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EscanerCelularPaginaComponent } from './escaner-celular-pagina.component';

/** Pantalla del celular de la cuenta (`/escaner-celular`, con sesión iniciada): cámara siempre lista que manda los códigos a la computadora. */
@NgModule({
  declarations: [EscanerCelularPaginaComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: EscanerCelularPaginaComponent }])]
})
export class EscanerCelularModule {}
