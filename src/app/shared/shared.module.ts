import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { ImagenSrcPipe } from '../productos/producto/pipes/imagen-src.pipe';
import { PalabraClaveAutocompleteComponent } from '../palabras-clave/autocomplete/palabra-clave-autocomplete.component';
import { UppercaseInputDirective } from './directives/uppercase-input.directive';
import { SelectorUbicacionComponent } from './selector-ubicacion/selector-ubicacion.component';
import { BotonVolverComponent } from './boton-volver/boton-volver.component';
import { SelectorFechaComponent } from './selector-fecha/selector-fecha.component';

@NgModule({
  declarations: [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SelectorUbicacionComponent,
    BotonVolverComponent,
    SelectorFechaComponent
  ],
  imports:  [CommonModule, FormsModule, OverlayModule],
  exports:  [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SelectorUbicacionComponent,
    BotonVolverComponent,
    SelectorFechaComponent
  ]
})
export class SharedModule {}
