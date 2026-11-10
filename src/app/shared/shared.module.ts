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
import { SharedModule as PrimeSharedModule } from 'primeng/api';
import { QRCodeModule } from 'angularx-qrcode';
import { EscanerCelularComponent } from './escaner-celular/escaner-celular.component';
import { EntradaCodigoQrComponent } from './entrada-codigo-qr/entrada-codigo-qr.component';
import { FotoCelularComponent } from './foto-celular/foto-celular.component';
import { CalculadoraPrecioComponent } from './calculadora-precio/calculadora-precio.component';

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
    EscanerCelularComponent,
    EntradaCodigoQrComponent,
    FotoCelularComponent,
    CalculadoraPrecioComponent
  ],
  imports:  [CommonModule, FormsModule, OverlayModule, DialogModule, PrimeSharedModule, QRCodeModule],
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
    EscanerCelularComponent,
    EntradaCodigoQrComponent,
    FotoCelularComponent,
    CalculadoraPrecioComponent
  ]
})
export class SharedModule {}
