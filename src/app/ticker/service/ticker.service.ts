import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ITickerItem, TICKER_DEFAULTS } from '../models/ticker.model';

const STORAGE_KEY = 'ticker_promos';

/**
 * Fuente de las frases de la cinta de promociones.
 *
 * ⚠️ FASE DUMMY — todo vive en `localStorage`, sin backend. Se hizo así a propósito para
 * poder afinar el comportamiento y el diseño antes de pedirle un endpoint al back.
 *
 * **Lo que implica hoy:** lo que edite el admin se guarda **solo en su navegador**. Otro
 * usuario, otra computadora o el mismo admin en modo incógnito ven los valores por defecto.
 * No es un bug de esta fase, es el alcance acordado.
 *
 * **Para conectar el backend después** basta con reemplazar el cuerpo de los 5 métodos
 * públicos por llamadas HTTP y quitar `leer()`/`guardar()`. Ni el componente de la cinta ni
 * la pantalla de administración se enteran — ambos solo consumen `items$` / `activos$`.
 */
@Injectable({ providedIn: 'root' })
export class TickerService {

  private readonly _items = new BehaviorSubject<ITickerItem[]>(this.leer());

  /** Todas las frases, incluidas las desactivadas. Lo usa la pantalla de administración. */
  readonly items$: Observable<ITickerItem[]> = this._items.asObservable();

  /** Solo las que se deben ver corriendo. Lo usa la cinta. */
  readonly activos$: Observable<ITickerItem[]> = this._items.pipe(
    map(items => items.filter(i => i.activo && i.texto.trim() !== ''))
  );

  get items(): ITickerItem[] { return this._items.getValue(); }

  agregar(texto: string): void {
    const limpio = texto.trim();
    if (!limpio) return;
    const nuevo: ITickerItem = { id: this.siguienteId(), texto: limpio, activo: true };
    this.persistir([...this.items, nuevo]);
  }

  actualizar(id: number, texto: string): void {
    const limpio = texto.trim();
    if (!limpio) return;
    this.persistir(this.items.map(i => i.id === id ? { ...i, texto: limpio } : i));
  }

  toggleActivo(id: number): void {
    this.persistir(this.items.map(i => i.id === id ? { ...i, activo: !i.activo } : i));
  }

  eliminar(id: number): void {
    this.persistir(this.items.filter(i => i.id !== id));
  }

  /** Sube o baja una frase. `delta` es -1 (subir) o +1 (bajar). */
  mover(id: number, delta: -1 | 1): void {
    const lista = [...this.items];
    const desde = lista.findIndex(i => i.id === id);
    const hasta = desde + delta;
    if (desde < 0 || hasta < 0 || hasta >= lista.length) return;
    [lista[desde], lista[hasta]] = [lista[hasta], lista[desde]];
    this.persistir(lista);
  }

  /** Vuelve a las frases de fábrica. */
  restaurar(): void {
    this.persistir(TICKER_DEFAULTS.map(i => ({ ...i })));
  }

  // ── Persistencia local (se va cuando llegue el backend) ────────────────

  private persistir(items: ITickerItem[]): void {
    this._items.next(items);
    this.guardar(items);
  }

  private siguienteId(): number {
    return this.items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
  }

  private leer(): ITickerItem[] {
    try {
      const crudo = localStorage.getItem(STORAGE_KEY);
      if (!crudo) return TICKER_DEFAULTS.map(i => ({ ...i }));
      const parsed = JSON.parse(crudo);
      // Si alguien dejó basura en localStorage, mejor caer a los defaults que romper
      // el layout de toda la app por una cinta decorativa.
      return Array.isArray(parsed) && parsed.length ? parsed : TICKER_DEFAULTS.map(i => ({ ...i }));
    } catch {
      return TICKER_DEFAULTS.map(i => ({ ...i }));
    }
  }

  private guardar(items: ITickerItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* cuota llena o modo restringido — no vale tirar la app por esto */ }
  }
}
