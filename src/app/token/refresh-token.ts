import { HttpClient } from '@angular/common/http';
import { defer, from, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Renueva el access token con la cookie de refresh. El back ROTA el refresh token en cada
 * renovación; si dos renovaciones salen casi a la vez con la misma cookie (dos pestañas, o el
 * arranque de la página y una petición que venció), la segunda llegaba "ya rotada" y el back
 * cerraba la sesión completa: el usuario veía que "lo sacaban" sin hacer nada.
 *
 * Con el candado del navegador (Web Locks) las renovaciones de TODAS las pestañas hacen fila: la
 * segunda sale ya con la cookie nueva. (El back además tolera 20 s de refresh doble.)
 */
export function renovarAccessToken(http: HttpClient): Observable<any> {
  const llamar = () => http.post<any>(`${environment.api_Url}/v1/auth/refresh`, {}, { withCredentials: true }).toPromise();
  const locks = (typeof navigator !== 'undefined' ? (navigator as any).locks : null);
  return defer(() => from(locks?.request ? locks.request('jade-refresh-token', llamar) : llamar()));
}
