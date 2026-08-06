import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, EMPTY } from 'rxjs';
import { AuthenticateService } from '../auth.service';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, filter, take, timeout, finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/registrar', '/auth/logout'];

// Endpoints que el backend puede exigir con `X-Requested-With: XMLHttpRequest` para cerrar el
// hueco de CSRF (`seguridad.exigir-header-refresh` en su YML). Hoy lo tienen APAGADO — mandar
// el header de más no molesta, y así el día que lo enciendan no se cae nadie.
// ⚠️ El orden importa: primero desplegamos esto, luego avisamos, y recién ahí lo encienden.
const CSRF_ENDPOINTS = ['/auth/refresh', '/auth/logout'];

// Sentinel para notificar a los requests en cola que el refresh falló
const REFRESH_FAILED = '__REFRESH_FAILED__';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshToken$ = new BehaviorSubject<string | null>(null);

  /**
   * Se enciende cuando un refresh falla. Mientras esté en `true` NO se vuelve a intentar
   * renovar: el backend rota el refresh token de verdad, y si le mandamos uno que ya se usó
   * lo interpreta como token robado y **cierra la sesión completa** del usuario. Se apaga
   * solo cuando vuelve a haber un access token (o sea, cuando el usuario se logueó de nuevo).
   */
  private sesionMuerta = false;

  constructor(
    private readonly authService: AuthenticateService,
    private readonly authRoles: AuthService,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isAuthEndpoint = AUTH_ENDPOINTS.some(e => req.url.includes(e));
    if (isAuthEndpoint) {
      return next.handle(req.clone({
        withCredentials: true,
        setHeaders: CSRF_ENDPOINTS.some(e => req.url.includes(e))
          ? { 'X-Requested-With': 'XMLHttpRequest' }
          : {}
      }));
    }

    const token = this.authService.getAccessToken();

    // Hay token de nuevo ⇒ el usuario volvió a iniciar sesión ⇒ se puede volver a refrescar.
    if (token && this.sesionMuerta) this.sesionMuerta = false;
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
    // La sesión ya murió — reintentar el refresh con un token ya rotado hace que el backend
    // cierre la sesión completa por sospecha de robo. Se corta aquí y se manda al login.
    if (this.sesionMuerta) {
      this.router.navigate(['/login']);
      return EMPTY;
    }

    if (this.isRefreshing) {
      // Requests en cola: esperan el token o el sentinel de fallo
      return this.refreshToken$.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          // EMPTY (y no un error) a propósito: el usuario ya va camino al login, y así ningún
          // componente muestra su Swal de "Error al cargar…" encima de la redirección.
          if (token === REFRESH_FAILED) return EMPTY;
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
          this.matarSesion();
          return EMPTY;
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
      catchError(() => {
        // Refresh token expirado (401/403), timeout u otro error de red
        // → limpiar sesión y redirigir al login automáticamente.
        //
        // Se devuelve EMPTY en vez de propagar el error: al desplegar los cambios de
        // seguridad del back, TODOS los refresh tokens viejos dejan de servir de golpe y el
        // primer refresh de cada usuario responde 401. Si se propagara, cada componente
        // mostraría su Swal de error justo mientras lo mandamos al login. El costo de esta
        // decisión: un `.subscribe({ next })` en vuelo no se entera de nada — aceptable,
        // porque el componente se destruye al navegar. El overlay global sí se apaga bien,
        // `LoadingInterceptor` usa `finalize()`, que corre también al completar.
        this.matarSesion();
        return EMPTY;
      }),
      finalize(() => {
        // Si el observable fue cancelado (unsubscribe) antes de que switchMap o catchError
        // pudieran resetear isRefreshing, lo hacemos aquí para evitar que todos los
        // requests posteriores queden bloqueados esperando en la cola del BehaviorSubject.
        if (this.isRefreshing) {
          this.isRefreshing = false;
          this.refreshToken$.next(REFRESH_FAILED);
          setTimeout(() => this.refreshToken$.next(null), 0);
        }
      })
    );
  }

  /** Limpia el token, libera la cola de requests y manda al login. */
  private matarSesion(): void {
    this.isRefreshing = false;
    this.sesionMuerta = true;
    this.authService.clearAccessToken();
    this.refreshToken$.next(REFRESH_FAILED);
    setTimeout(() => this.refreshToken$.next(null), 0);
    this.router.navigate(['/login']);
  }
}
