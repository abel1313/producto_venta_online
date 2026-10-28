import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { ImagenSrcPipe } from '../productos/producto/pipes/imagen-src.pipe';
import { PalabraClaveAutocompleteComponent } from '../palabras-clave/autocomplete/palabra-clave-autocomplete.component';
import { UppercaseInputDirective } from './directives/uppercase-input.directive';
import { SoloLetrasInputDirective } from './directives/solo-letras-input.directive';
import { PrimeraMayusculaInputDirective } from './directives/primera-mayuscula-input.directive';
import { SelectorUbicacionComponent } from './selector-ubicacion/selector-ubicacion.component';
import { UbicacionLocalComponent } from './ubicacion-local/ubicacion-local.component';
import { BotonVolverComponent } from './boton-volver/boton-volver.component';
import { SelectorFechaComponent } from './selector-fecha/selector-fecha.component';
import { AyudaPantallaComponent } from './ayuda-pantalla/ayuda-pantalla.component';
import { AyudaOpcionesComponent } from './ayuda-opciones/ayuda-opciones.component';
import { AltaArticulosComponent } from './alta-articulos/alta-articulos.component';
import { FiltroBuscableComponent } from './filtro-buscable/filtro-buscable.component';
import { DialogModule } from 'primeng/dialog';
import { CobroTarjetaClienteComponent } from '../pedidos/cobro/cobro-tarjeta-cliente/cobro-tarjeta-cliente.component';

@NgModule({
  declarations: [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SoloLetrasInputDirective,
    PrimeraMayusculaInputDirective,
    SelectorUbicacionComponent,
    UbicacionLocalComponent,
    BotonVolverComponent,
    SelectorFechaComponent,
    AyudaPantallaComponent,
    AyudaOpcionesComponent,
    AltaArticulosComponent,
    FiltroBuscableComponent,
    CobroTarjetaClienteComponent
  ],
  imports:  [CommonModule, FormsModule, OverlayModule, DialogModule],
  exports:  [
    ImagenSrcPipe,
    PalabraClaveAutocompleteComponent,
    UppercaseInputDirective,
    SoloLetrasInputDirective,
    PrimeraMayusculaInputDirective,
    SelectorUbicacionComponent,
    UbicacionLocalComponent,
    BotonVolverComponent,
    SelectorFechaComponent,
    AyudaPantallaComponent,
    AyudaOpcionesComponent,
    AltaArticulosComponent,
    FiltroBuscableComponent,
    CobroTarjetaClienteComponent
  ]
})
export class SharedModule {}
