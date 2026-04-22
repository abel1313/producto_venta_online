import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { AuthenticateService } from '../auth.service';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/registrar', '/auth/logout'];

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private readonly authService: AuthenticateService,
    private readonly authRoles: AuthService,
    private readonly http: HttpClient
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isAuthEndpoint = AUTH_ENDPOINTS.some(e => req.url.includes(e));
    if (isAuthEndpoint) {
      return next.handle(req.clone({ withCredentials: true }));
    }

    const token = this.authService.getAccessToken();
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` }, withCredentials: true })
      : req.clone({ withCredentials: true });

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this.handleRefresh(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handleRefresh(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      // Cola el request hasta que el refresh en curso termine
      return this.refreshToken$.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: true
        })))
      );
    }

    this.isRefreshing = true;
    this.refreshToken$.next(null);

    return this.http.post<{ accessToken: string }>(
      `${environment.api_Url}/auth/refresh`, {}, { withCredentials: true }
    ).pipe(
      switchMap(response => {
        this.isRefreshing = false;
        this.authService.setAccessToken(response.accessToken);
        this.authRoles.setRolesFromToken(response.accessToken);
        this.refreshToken$.next(response.accessToken);
        return next.handle(req.clone({
          setHeaders: { Authorization: `Bearer ${response.accessToken}` },
          withCredentials: true
        }));
      }),
      catchError(err => {
        this.isRefreshing = false;
        this.refreshToken$.next(null);
        return throwError(() => err);
      })
    );
  }
}
