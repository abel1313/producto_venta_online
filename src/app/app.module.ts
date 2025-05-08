import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavbarComponent } from './navbar/navbar.component';
import { ProductoModule } from './productos/producto/producto.module';
import { VentaProductoModule } from './ventas/venta-producto/venta-producto.module';
import { BuscarGenericoComponent } from './buscador/buscar-generico/buscar-generico.component';



@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ProductoModule,
    VentaProductoModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
