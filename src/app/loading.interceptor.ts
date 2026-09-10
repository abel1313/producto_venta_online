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
  // `/redes-sociales/` NO puede llevar overlay: subir un video puede tardar minutos y el
  // overlay global taparía TODA la app sin decir nada — esa pantalla muestra su propia barra
  // de progreso en su lugar.
  // `/v1/cinta/activos` va acá porque se pide en el arranque de CADA carga de la app: es un
  // adorno y no tiene por qué tapar la pantalla con el overlay mientras responde. Las demás
  // rutas de `/v1/cinta` (las del admin) NO se saltan — ahí sí es una acción del usuario.
  // `/publico/premio/` va aca porque el modal del premio ya pinta su propio
  // "Cargando el detalle..." dentro de la caja: el overlay global encima solo servia para
  // tapar la pagina, y si esa peticion se atoraba el visitante cerraba el modal y se
  // quedaba con la pantalla bloqueada sin nada que le explicara por que.
  private readonly skipUrls = ['/chatbot/', '/v1/cinta/activos', '/redes-sociales/',
                               '/publico/premio/'];

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
