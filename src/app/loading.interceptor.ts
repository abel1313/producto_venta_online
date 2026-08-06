import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { finalize } from 'rxjs/operators'; // ✅ correcto


import { LoadingService } from './loading.service';
import { Observable } from 'rxjs';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  // URLs que no deben mostrar el spinner global.
  // `/redes-sociales/`: publicar en Facebook sube el archivo y luego espera a que el back
  // lo mande a Meta — hasta 5 minutos para un video. El overlay taparía toda la app ese
  // rato sin decir nada; esa pantalla muestra su propia barra de progreso.
  private readonly skipUrls = ['/chatbot/', '/redes-sociales/'];

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.skipUrls.some(url => req.url.includes(url))) {
      return next.handle(req);
    }
    this.loadingService.show();
    return next.handle(req).pipe(
      finalize(() => this.loadingService.hide())
    );
  }
}
