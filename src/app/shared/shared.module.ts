import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImagenSrcPipe } from '../productos/producto/pipes/imagen-src.pipe';
import { PalabraClaveAutocompleteComponent } from '../palabras-clave/autocomplete/palabra-clave-autocomplete.component';

@NgModule({
  declarations: [
    ImagenSrcPipe,
    // Autocomplete reutilizable para seleccionar palabra clave en cualquier formulario
    PalabraClaveAutocompleteComponent
  ],
  imports:  [CommonModule, FormsModule],
  exports:  [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent
  ]
})
export class SharedModule {}
