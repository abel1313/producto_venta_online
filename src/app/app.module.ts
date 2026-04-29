import { LoadingInterceptor } from './loading.interceptor';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AccederService } from './login/acceder.service';
import { AuthenticateService } from './auth.service';
import { AuthService } from './auth/auth.service';

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
import { LoadingComponent } from './loading/loading.component';
import { QrVentasJadeComponent } from './qr-ventas-jade/qr-ventas-jade.component';
import { QRCodeModule } from 'angularx-qrcode';   // ✅ este es el correcto
import { ChatbotComponent } from './chatbot/chatbot.component';
import { FormsModule } from '@angular/forms';
export function bootstrapAuth(
  acceder: AccederService,
  auth: AuthenticateService,
  authService: AuthService
): () => Promise<void> {
  return () => new Promise<void>(resolve => {
    acceder.refresh().subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.data?.accessToken ?? res?.token ?? '';
        if (token) {
          auth.setAccessToken(token);
          authService.setRolesFromToken(token);
        }
        resolve();
      },
      error: () => resolve()
    });
  });
}

@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: bootstrapAuth,
      deps: [AccederService, AuthenticateService, AuthService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    }
  ],
  declarations: [
    AppComponent,
    NavbarComponent,
    PaginaNoDisponibleComponent,
    HomeComponent,
    LoadingComponent,
    QrVentasJadeComponent,
    ChatbotComponent,
  ],
  imports: [
    QRCodeModule,
    FormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ProductoModule,
    VentaProductoModule,
    MisGastosModule,
    RouterModule,
    NbThemeModule.forRoot({ name: 'default' }),
    NbLayoutModule,
    NbEvaIconsModule,
    
   
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
