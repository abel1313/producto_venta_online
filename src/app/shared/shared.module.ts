import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImagenSrcPipe } from '../productos/producto/pipes/imagen-src.pipe';
import { PalabraClaveAutocompleteComponent } from '../palabras-clave/autocomplete/palabra-clave-autocomplete.component';
import { UppercaseInputDirective } from './directives/uppercase-input.directive';
import { SelectorUbicacionComponent } from './selector-ubicacion/selector-ubicacion.component';

@NgModule({
  declarations: [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SelectorUbicacionComponent
  ],
  imports:  [CommonModule, FormsModule],
  exports:  [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SelectorUbicacionComponent
  ]
})
export class SharedModule {}
