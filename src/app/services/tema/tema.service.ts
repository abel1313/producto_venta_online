import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ALIAS_LEGACY, aRgb, coloresDelMenu, ITemaVariable, RGB_DERIVADOS, SOMBRAS_CARD } from './tema.model';
import { ThemeService } from '../theme/theme.service';

// Personalización visual en vivo -- lee GET /v1/tema-variable/activo una vez al iniciar la app y
// aplica cada fila como override inline sobre `body` (document.body.style.setProperty), por
// ENCIMA de los tokens fijos que ya trae styles.scss. Catálogo dinámico (ver TemaVariable en el
// backend): agregar una fila nueva no requiere ningún cambio de código, ni aquí ni en el back --
// el bucle de aplicarSegunTema() es genérico, itera lo que sea que devuelva el catálogo.
//
// Cada variable trae valorClaro/valorOscuro -- se aplica el que corresponda según
// `body.theme-light`/`body.theme-dark` esté activo, y se re-aplica cada vez que
// ThemeService.isDark$ cambia (auto-switch por hora o toggle manual). Si valorOscuro es NULL
// (variables estructurales como card-radius/card-shadow) se usa valorClaro para los dos modos.
const ESTILO_DEFAULT = 'jade';

@Injectable({ providedIn: 'root' })
export class TemaService {

  private readonly url = `${environment.api_Url}/v1/tema-variable`;
  private variables: ITemaVariable[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly themeService: ThemeService
  ) {}

  /** Llamar una vez al iniciar la app (ver app.component.ts), después de themeService.init(). */
  init(): void {
    // El diseño de fábrica es Jade: sin catálogo (back caído, base sin la fila "estilo") la capa
    // de letra/campos/botones de tema-jade.scss queda encendida igual.
    document.body.dataset['estilo'] = ESTILO_DEFAULT;
    setTimeout(() => this.derivarColoresMenu());
    this.getActivo().subscribe({
      next: variables => {
        this.variables = variables;
        this.aplicarSegunTema(this.themeService.isDark);
      },
      // Si falla (backend caído, primera carga sin la tabla todavía, etc.) la app sigue
      // pintando con los valores fijos de styles.scss -- nunca se rompe por esto.
      error: () => {}
    });

    this.themeService.isDark$.subscribe(isDark => this.aplicarSegunTema(isDark));
  }

  /** Público (GET /activo) -- todo el catálogo, para aplicar en vivo. */
  getActivo(): Observable<ITemaVariable[]> {
    return this.http.get<{ data: ITemaVariable[] }>(`${this.url}/activo`).pipe(map(res => res.data ?? []));
  }

  // ── CRUD (ADMIN, pantalla de Personalización) ────────────────────────────

  getAll(page = 0, size = 100): Observable<ITemaVariable[]> {
    return this.http
      .get<{ data: ITemaVariable[] }>(`${this.url}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data ?? []));
  }

  crear(v: ITemaVariable): Observable<ITemaVariable> {
    return this.http.post<{ data: ITemaVariable }>(`${this.url}/save`, v).pipe(map(res => res.data));
  }

  actualizar(id: number, v: ITemaVariable): Observable<ITemaVariable> {
    return this.http.put<{ data: ITemaVariable }>(`${this.url}/update/${id}`, { id, ...v }).pipe(map(res => res.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/delete`, { body: id });
  }

  /** Preview instantáneo desde la pantalla de Personalización, sin esperar al guardado. */
  previsualizar(variables: ITemaVariable[]): void {
    this.variables = variables;
    this.aplicarSegunTema(this.themeService.isDark);
  }

  private aplicarSegunTema(isDark: boolean): void {
    const body = document.body.style;
    for (const v of this.variables) {
      const valor = (isDark ? v.valorOscuro : v.valorClaro) || v.valorClaro;
      if (!valor) continue;
      if (v.clave === 'estilo') {
        document.body.dataset['estilo'] = valor;
        continue;
      }
      if (v.clave === 'card-shadow') {
        body.setProperty('--card-shadow', SOMBRAS_CARD[valor] ?? SOMBRAS_CARD['media']);
      } else if (v.tipo === 'numero') {
        body.setProperty(`--${v.clave}`, `${valor}px`);
      } else {
        body.setProperty(`--${v.clave}`, valor);
      }
      const alias = ALIAS_LEGACY[v.clave];
      if (alias) alias.forEach(a => body.setProperty(a, valor));
      const rgb = RGB_DERIVADOS[v.clave] ? aRgb(valor) : null;
      if (rgb) RGB_DERIVADOS[v.clave].forEach(a => body.setProperty(a, rgb));
    }
    // Después de que ThemeService cambie la clase del body (avisa antes de cambiarla).
    setTimeout(() => this.derivarColoresMenu());
  }

  /**
   * --menu-bg / --menu-text / --menu-scheme: el menú de opciones de las listas (select, p-dropdown,
   * datalist). Ver coloresDelMenu() en tema.model.ts. Se calcula con los colores que el navegador
   * ya resolvió (filas de Personalización o los de fábrica de styles.scss), así sirve para
   * cualquier diseño que escoja o arme el dueño.
   */
  private derivarColoresMenu(): void {
    const body = document.body;
    const muestra = document.createElement('div');
    muestra.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;'
      + 'background-color:var(--input-bg);color:var(--input-text);border-top:0 solid var(--app-bg)';
    body.appendChild(muestra);
    const cs = getComputedStyle(muestra);
    const menu = coloresDelMenu(cs.backgroundColor, cs.color, cs.borderTopColor);
    muestra.remove();
    if (!menu) return;
    body.style.setProperty('--menu-bg', menu.fondo);
    body.style.setProperty('--menu-text', menu.letra);
    body.style.setProperty('--menu-scheme', menu.esquema);
  }
}
