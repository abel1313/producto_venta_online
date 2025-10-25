import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavbarComponent } from './navbar/navbar.component';
import { ProductoModule } from './productos/producto/producto.module';
import { VentaProductoModule } from './ventas/venta-producto/venta-producto.module';
import { MisGastosModule } from './gastos/mis-gastos/mis-gastos.module';
import { RouterModule } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TokenInterceptor } from './token/TokenInterceptor ';
import { PaginaNoDisponibleComponent } from './pagina-no-disponible/pagina-no-disponible.component';
import { HomeComponent } from './home/home.component';
import { NbThemeModule, NbLayoutModule } from '@nebular/theme';
import { NbEvaIconsModule } from '@nebular/eva-icons';


@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }
  ],
  declarations: [
    AppComponent,
    NavbarComponent,
    PaginaNoDisponibleComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ProductoModule,
    VentaProductoModule,
    MisGastosModule,
    RouterModule,
    NbThemeModule.forRoot({ name: 'dark' }),
    NbLayoutModule,
    NbEvaIconsModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
