import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, TimeoutError } from 'rxjs';
import { AuthenticateService } from '../auth.service';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, filter, take, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/registrar', '/auth/logout'];

// Sentinel para notificar a los requests en cola que el refresh falló
const REFRESH_FAILED = '__REFRESH_FAILED__';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshToken$ = new BehaviorSubject<string | null>(null);

  constructor(
    private readonly authService: AuthenticateService,
    private readonly authRoles: AuthService,
    private readonly http: HttpClient,
    private readonly router: Router
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
      // Requests en cola: esperan el token o el sentinel de fallo
      return this.refreshToken$.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          if (token === REFRESH_FAILED) {
            // El refresh falló — propaga el error al componente que esperaba
            return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Session expired' }));
          }
          return next.handle(req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }));
        })
      );
    }

    this.isRefreshing = true;
    this.refreshToken$.next(null);

    return this.http.post<any>(
      `${environment.api_Url}/auth/refresh`, {}, { withCredentials: true }
    ).pipe(
      timeout(10_000),
      switchMap(response => {
        const token: string = response?.response?.accessToken ?? response?.accessToken ?? response?.data?.accessToken ?? response?.token ?? '';
        if (!token) {
          this.isRefreshing = false;
          this.authService.clearAccessToken();
          this.refreshToken$.next(REFRESH_FAILED);
          setTimeout(() => this.refreshToken$.next(null), 0);
          this.router.navigate(['/login']);
          return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Token vacío en refresh' }));
        }
        this.isRefreshing = false;
        this.authService.setAccessToken(token);
        this.authRoles.setRolesFromToken(token);
        this.refreshToken$.next(token);
        return next.handle(req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }));
      }),
      catchError(err => {
        this.isRefreshing = false;
        this.authService.clearAccessToken();
        this.refreshToken$.next(REFRESH_FAILED);
        setTimeout(() => this.refreshToken$.next(null), 0);
        const finalErr = err instanceof TimeoutError
          ? new HttpErrorResponse({ status: 0, statusText: 'Refresh timeout' })
          : err;
        this.router.navigate(['/login']);
        return throwError(() => finalErr);
      })
    );
  }
}
