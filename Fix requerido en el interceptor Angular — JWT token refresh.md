# Fix requerido en el interceptor Angular — JWT token refresh

**Fecha:** 2026-06-05  
**Reportado por:** backend  
**Síntoma:** "error al actualizar" aparece de forma intermitente después de dejar el formulario abierto más de 15 minutos. Recargar la página (F5) lo resuelve.

---

## Causa raíz — problema 1: lectura incorrecta del response de `/auth/refresh`

El endpoint `/auth/refresh` devuelve esto:

```json
{ "accessToken": "eyJhbGci..." }
```

El interceptor debe leer:
```typescript
response.accessToken  // ✅ CORRECTO
```

Si actualmente está leyendo:
```typescript
response.response.accessToken  // ❌ INCORRECTO — da undefined
```

...entonces el token guardado es `undefined` → el retry manda `Bearer undefined` → el backend rechaza con 401 → el usuario ve "error al actualizar".

**Por qué pasa solo "a veces":** el access token dura 15 minutos. Si el formulario se llena en menos de 15 minutos, el token aún es válido y no se llega al refresh. Si se tarda más de 15 minutos → el token expira → el interceptor falla → error.

---

## Causa raíz — problema 2: race condition con requests simultáneas

Cuando Angular navega a una página y dispara varias requests al mismo tiempo (producto + imágenes + variantes) y el token ya expiró:

- Request A → 401 → interceptor llama `/auth/refresh` ✅
- Request B → 401 → interceptor llama `/auth/refresh` de nuevo ❌
- Request C → 401 → interceptor llama `/auth/refresh` de nuevo ❌

Solo la primera debería refrescar; las demás deben esperar ese resultado. Sin este control, pueden generarse condiciones de carrera donde el estado del token queda inconsistente.

---

## Fix completo — patrón `BehaviorSubject`

```typescript
import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service'; // ajustar ruta

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();
    const reqConToken = token ? this.agregarToken(req, token) : req;

    return next.handle(reqConToken).pipe(
      catchError(error => {
        if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
          return this.manejar401(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private manejar401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next(null);

      return this.authService.refresh().pipe(
        switchMap((res: any) => {
          this.isRefreshing = false;
          const nuevoToken = res.accessToken; // ← LEER ASÍ (directo, sin .response.)
          this.authService.guardarToken(nuevoToken);
          this.refreshSubject.next(nuevoToken);
          return next.handle(this.agregarToken(req, nuevoToken));
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );
    }

    // Las otras requests esperan a que la primera termine el refresh
    return this.refreshSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next.handle(this.agregarToken(req, token!)))
    );
  }

  private agregarToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
}
```

---

## Qué revisar en `AuthService`

El método `refresh()` debe estar haciendo algo como:

```typescript
refresh(): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/auth/refresh`, {}, {
    withCredentials: true  // ← necesario para enviar la cookie HttpOnly del refresh token
  });
}
```

Si falta `withCredentials: true`, el browser no manda la cookie → el backend responde 401 "No hay refresh token" → el usuario queda deslogueado.

---

## Response del backend — referencia

| Endpoint | Response exitoso |
|----------|-----------------|
| `POST /auth/login` | `{ "accessToken": "eyJ..." }` |
| `POST /auth/refresh` | `{ "accessToken": "eyJ..." }` |
| `POST /auth/logout` | `200 OK` — `"Sesión cerrada"` |

Ambos login y refresh devuelven exactamente el mismo formato `{ "accessToken": "..." }` — **no hay wrapper `.response`**.

---

## Comportamiento esperado después del fix

1. Usuario llena formulario durante 30 minutos.
2. Token expira a los 15 min.
3. Usuario hace clic en "Actualizar".
4. Interceptor detecta 401 → llama `/auth/refresh` (una sola vez).
5. Lee `response.accessToken` correctamente → guarda el nuevo token.
6. Reintenta el request original con el nuevo token.
7. El update se guarda. El usuario no pierde lo que llenó.
