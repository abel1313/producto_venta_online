/**
 * Frase de la cinta de promociones que corre en la parte de arriba de la pantalla.
 *
 * ⚠️ FASE DUMMY (2026-08-05): esto todavía NO viene del backend. `TickerService` lo guarda
 * en `localStorage` para que el admin pueda editarlo y ver que persiste. Cuando se le pida
 * el endpoint al back, lo único que cambia es de dónde salen y a dónde se guardan los datos
 * — la forma de este modelo y toda la pantalla se quedan igual.
 */
export interface ITickerItem {
  /** Identificador local. Al conectar el backend será el id real de la fila. */
  id: number;
  /** El texto que se ve corriendo. Se muestra tal cual, en mayúsculas por CSS. */
  texto: string;
  /** Desactivado = se conserva en la lista del admin pero no sale en la cinta. */
  activo: boolean;
}

/** Lo que se ve la primera vez, antes de que el admin toque nada. */
export const TICKER_DEFAULTS: ITickerItem[] = [
  { id: 1, texto: 'Bolsas',                activo: true },
  { id: 2, texto: 'Blusas',                activo: true },
  { id: 3, texto: 'Pantalones',            activo: true },
  { id: 4, texto: 'Perfumes 10 ml',        activo: true },
  { id: 5, texto: 'Envíos a todo México',  activo: true },
  { id: 6, texto: 'Promos de temporada',   activo: true }
];
