/**
 * Frase de la cinta de promociones que corre en la parte de arriba de la pantalla.
 *
 * Viene del catálogo `/v1/cinta` del backend (mismo patrón que `lugares-entrega`).
 */
export interface ICintaItem {
  id: number;
  /** El texto que se ve corriendo. Máx. 120 — el back responde 400 si se pasa o va vacío. */
  texto: string;
  /** Desactivado = se conserva en la lista del admin pero no sale en la cinta. */
  activo: boolean;
  /** Posición en la cinta. El back devuelve `/activos` ya ordenado por este campo. */
  orden: number;
}

/** Lo que se manda en `save` / `update` (el `id` va en la URL, salvo en `update`). */
export interface ICintaRequest {
  texto: string;
  activo: boolean;
  orden: number;
}

/**
 * Frases sugeridas para arrancar.
 *
 * ⚠️ NO son datos de fábrica: el back dejó la tabla `cinta_promocion` **vacía** a propósito y
 * pidió que las diéramos de alta nosotros. La pantalla de administración ofrece cargarlas de
 * un jalón, pero **solo cuando la lista está vacía** — si el botón estuviera siempre visible,
 * un clic de más las duplicaría (cada carga hace `POST`, no reemplaza nada).
 */
export const CINTA_SUGERIDAS: string[] = [
  'Bolsas',
  'Blusas',
  'Pantalones',
  'Perfumes 10 ml',
  'Envíos a todo México',
  'Promos de temporada'
];
