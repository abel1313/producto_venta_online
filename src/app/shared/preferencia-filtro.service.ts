import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';

export type PantallaFiltros = 'tienda-buscar' | 'productos-buscar' | 'pedidos-mis-pedidos';

type Filtros = Record<string, unknown>;

const RUTA_PANTALLA: Record<PantallaFiltros, string> = {
  'tienda-buscar': 'tienda/buscar',
  'productos-buscar': 'productos/buscar',
  'pedidos-mis-pedidos': 'pedidos/mis-pedidos'
};

/**
 * Filtros guardados en la base por usuario (Bloque 2, back `/v1/preferencias-filtro`).
 *
 * Solo el personal: un cliente (ROLE_USUARIO) no guarda nada y su tienda sigue igual. Se guardan
 * solo los filtros, nunca el texto buscado ni la página. La memoria de cada pantalla
 * (`filtrosCache`) sigue mandando al navegar; la base solo entra al llegar sin memoria (recarga,
 * otra sesión, otro dispositivo).
 */
@Injectable({ providedIn: 'root' })
export class PreferenciaFiltroService {

  private readonly url = `${environment.api_Url}/v1/preferencias-filtro`;

  /** null = borrar. Cada pantalla espera su pausa por separado y gana el último cambio. */
  private readonly cambios = new Subject<{ pantalla: PantallaFiltros; filtros: Filtros | null }>();

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {
    this.cambios.pipe(
      groupBy(c => c.pantalla),
      mergeMap(porPantalla => porPantalla.pipe(
        debounceTime(800),
        switchMap(c => this.enviar(c.pantalla, c.filtros))
      ))
    ).subscribe();
  }

  puedeGuardar(pantalla: PantallaFiltros): boolean {
    const roles = this.authService.rolesValue;
    return roles.length > 0 && !roles.includes('ROLE_USUARIO')
        && this.authService.tienePantalla(RUTA_PANTALLA[pantalla]);
  }

  /** Lo guardado, o null si no hay, si no aplica a este usuario o si la base no responde. */
  obtener(pantalla: PantallaFiltros): Observable<Filtros | null> {
    if (!this.puedeGuardar(pantalla)) return of(null);
    return this.http.get<{ data?: { filtros?: Filtros } }>(`${this.url}/${pantalla}`, { observe: 'response' }).pipe(
      map((res: HttpResponse<{ data?: { filtros?: Filtros } }>) => res.body?.data?.filtros ?? null),
      catchError(() => of(null))
    );
  }

  guardar(pantalla: PantallaFiltros, filtros: Filtros): void {
    if (this.puedeGuardar(pantalla)) this.cambios.next({ pantalla, filtros });
  }

  borrar(pantalla: PantallaFiltros): void {
    if (this.puedeGuardar(pantalla)) this.cambios.next({ pantalla, filtros: null });
  }

  /** En segundo plano: si falla, la pantalla sigue con su memoria como antes. */
  private enviar(pantalla: PantallaFiltros, filtros: Filtros | null): Observable<unknown> {
    const peticion = filtros === null
      ? this.http.delete(`${this.url}/${pantalla}`)
      : this.http.put(`${this.url}/${pantalla}`, { filtros });
    return peticion.pipe(catchError(err => {
      console.warn(`No se pudieron guardar los filtros de ${pantalla}`, err?.status);
      return of(null);
    }));
  }
}
