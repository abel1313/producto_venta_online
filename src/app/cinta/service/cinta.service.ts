import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ICintaItem, ICintaRequest } from '../models/cinta.model';

/**
 * Catálogo de frases de la cinta de promociones — `/v1/cinta` (mismo patrón que
 * `lugares-entrega`).
 *
 * ⚠️ **Hay DOS listas y no son intercambiables**, por una razón de permisos:
 *
 * - `activos$` ← `GET /activos`, **público, sin auth**. Es la que consume la cinta, que se
 *   pinta también para el cliente (y hasta para el visitante sin sesión).
 * - `items$` ← `GET /getAll`, **solo ADMIN**. Es la que consume la pantalla de administración,
 *   porque es la única que trae también las frases apagadas.
 *
 * Si la cinta se colgara de `items$` para "ahorrarse una llamada", a cualquier cliente le
 * saldría un 403 en cada carga y la vería vacía.
 */
@Injectable({ providedIn: 'root' })
export class CintaService {

  private readonly url = `${environment.api_Url}/v1/cinta`;

  private readonly _activos = new BehaviorSubject<ICintaItem[]>([]);
  private readonly _items   = new BehaviorSubject<ICintaItem[]>([]);

  /** Solo las que se ven corriendo, ya ordenadas por el back. */
  readonly activos$: Observable<ICintaItem[]> = this._activos.asObservable();

  /** Todas, incluidas las apagadas. Solo ADMIN. */
  readonly items$: Observable<ICintaItem[]> = this._items.asObservable();

  constructor(private readonly http: HttpClient) {}

  get items(): ICintaItem[] { return this._items.getValue(); }

  /**
   * Carga la cinta visible. **Falla en silencio a propósito**: esto corre en el arranque de
   * la app, en TODAS las pantallas y para cualquier visitante. Si el endpoint no está arriba
   * (hoy mismo: falta correr `migration_cinta_promocion.sql` en QA), lo peor que puede pasar
   * es que la cinta no aparezca — jamás un Swal de error ni un throw que ensucie la consola
   * de un cliente por un adorno.
   */
  cargarActivos(): void {
    this.http.get<{ data: ICintaItem[] }>(`${this.url}/activos`).pipe(
      map(res => res?.data ?? []),
      catchError(() => of([] as ICintaItem[]))
    ).subscribe(items => this._activos.next(items));
  }

  /**
   * Carga TODAS para la pantalla de administración. Acá el error SÍ se propaga — el admin
   * tiene que enterarse de por qué no ve su lista.
   *
   * `page`/`size` van siempre: el CRUD genérico del back no tiene valores por defecto y sin
   * ellos responde error. Se pide `size` grande a propósito para traerlas todas de un jalón
   * — son pocas frases y la pantalla las muestra juntas para poder reordenarlas.
   */
  cargarTodas(): Observable<ICintaItem[]> {
    return this.http.get<{ data: ICintaItem[] }>(`${this.url}/getAll?page=0&size=200`).pipe(
      map(res => res?.data ?? []),
      tap(items => this._items.next(items))
    );
  }

  crear(texto: string): Observable<ICintaItem> {
    const body: ICintaRequest = { texto: texto.trim(), activo: true, orden: this.siguienteOrden() };
    return this.http.post<{ data: ICintaItem }>(`${this.url}/save`, body).pipe(map(r => r.data));
  }

  /** `update` pide el objeto completo, con `id` incluido en el body. */
  actualizar(item: ICintaItem): Observable<ICintaItem> {
    return this.http
      .put<{ data: ICintaItem }>(`${this.url}/update/${item.id}`, item)
      .pipe(map(r => r.data));
  }

  /** El id va como número JSON crudo en el body, NO `{ id }` — igual que `lugares-entrega`. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/delete`, { body: id });
  }

  /**
   * Sube o baja una frase. `delta` es -1 (subir) o +1 (bajar).
   *
   * El back no armó un endpoint de reordenamiento en lote, así que hay que mandar un `update`
   * por cada fila que cambia de lugar.
   *
   * **No intercambia los dos `orden` entre sí, renumera la lista completa por posición.**
   * Intercambiarlos parece más directo, pero se rompe si dos filas comparten el mismo `orden`
   * (fácil de provocar: si dos altas salen con el mismo número, o si un intercambio anterior
   * quedó a medias) — ahí el "intercambio" no movería nada y el botón se vería muerto.
   * Renumerar por índice siempre deja la lista consistente, y de todos modos solo se mandan
   * las filas cuyo `orden` realmente cambió (normalmente dos).
   */
  mover(id: number, delta: -1 | 1): Observable<unknown> {
    const lista = [...this.items];
    const desde = lista.findIndex(i => i.id === id);
    const hasta = desde + delta;
    if (desde < 0 || hasta < 0 || hasta >= lista.length) return of(null);

    [lista[desde], lista[hasta]] = [lista[hasta], lista[desde]];

    const cambiadas = lista
      .map((item, idx) => ({ ...item, orden: idx }))
      .filter((item, idx) => item.orden !== lista[idx].orden);

    if (!cambiadas.length) return of(null);
    return forkJoin(cambiadas.map(item => this.actualizar(item)));
  }

  /** Alta en lote de las frases sugeridas, respetando el orden en que vienen. */
  crearVarias(textos: string[]): Observable<ICintaItem[]> {
    const base = this.siguienteOrden();
    return forkJoin(
      textos.map((texto, idx) => this.http
        .post<{ data: ICintaItem }>(`${this.url}/save`, { texto, activo: true, orden: base + idx })
        .pipe(map(r => r.data)))
    );
  }

  private siguienteOrden(): number {
    return this.items.reduce((max, i) => Math.max(max, i.orden ?? 0), -1) + 1;
  }
}
