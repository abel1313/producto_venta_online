import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
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
        // RxJS 6: throwError(valor) — NO usar throwError(() => valor), en RxJS 6 tira
        // la función misma como error en vez de llamarla.
        // Si el body llegó como string (backend sin Content-Type: application/json),
        // intentar parsearlo para que err.error.mensaje sea accesible en los componentes.
        let normalizedError = error;
        if (error.error && typeof error.error === 'string') {
          try {
            const parsed = JSON.parse(error.error);
            normalizedError = new HttpErrorResponse({
              error: parsed,
              headers: error.headers,
              status: error.status,
              statusText: error.statusText,
              url: error.url ?? undefined,
            });
          } catch { /* no es JSON válido — dejar como estaba */ }
        }
        if (normalizedError.status === 401) {
          return this.handleRefresh(req, next);
        }
        return throwError(normalizedError);
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
            return throwError(new HttpErrorResponse({ status: 401, statusText: 'Session expired' }));
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
      `${environment.api_Url}/v1/auth/refresh`, {}, { withCredentials: true }
    ).pipe(
      timeout(10_000),
      switchMap(response => {
        const token: string = response?.response?.accessToken
          ?? response?.accessToken
          ?? response?.data?.accessToken
          ?? response?.token
          ?? '';

        // Si el back respondió 200 pero sin token — tratar como fallo
        if (!token) {
          this.isRefreshing = false;
          this.authService.clearAccessToken();
          this.refreshToken$.next(REFRESH_FAILED);
          setTimeout(() => this.refreshToken$.next(null), 0);
          this.router.navigate(['/login']);
          return throwError(new HttpErrorResponse({ status: 401, statusText: 'Token vacío en refresh' }));
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
        // Refresh token expirado (401/403), timeout u otro error de red
        // → limpiar sesión y redirigir al login automáticamente
        this.isRefreshing = false;
        this.authService.clearAccessToken();
        this.refreshToken$.next(REFRESH_FAILED);
        setTimeout(() => this.refreshToken$.next(null), 0);
        const finalErr = err instanceof TimeoutError
          ? new HttpErrorResponse({ status: 0, statusText: 'Refresh timeout — sesión expirada' })
          : err;
        this.router.navigate(['/login']);
        return throwError(finalErr);
      })
    );
  }
}
