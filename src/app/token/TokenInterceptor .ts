import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthenticateService } from '../auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

    constructor(private authService: AuthenticateService, private http: HttpClient) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();

    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true // 👈 importante para que se mande la cookie
      });
    } else {
      authReq = req.clone({ withCredentials: true });
    }

    return next.handle(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expirado → pedir uno nuevo usando la cookie
        return this.http.post<any>(`${environment.api_auth}/auth/refresh`, {}, { withCredentials: true })
          .pipe(
            switchMap(response => {
              this.authService.setAccessToken(response.accessToken);
              // Reintentar la petición original con el nuevo token
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${response.accessToken}` },
                withCredentials: true
              });
              return next.handle(newReq);
            })
          );
      }
      return throwError(() => error);
    })
    );
  }
}
