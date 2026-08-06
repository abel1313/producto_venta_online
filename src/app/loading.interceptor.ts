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

  // URLs que no deben mostrar el spinner global
  // (`/redes-sociales/` se quitó 2026-08-05 junto con el feature de Facebook — al
  //  reactivarlo hay que volver a agregarlo, si no el overlay tapa toda la app durante
  //  los minutos que tarda la subida de un video).
  private readonly skipUrls = ['/chatbot/'];

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
