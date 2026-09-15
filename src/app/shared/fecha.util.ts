/**
 * Fechas en `yyyy-MM-dd` / `yyyy-MM` calculadas con el calendario LOCAL, no con UTC.
 *
 * ⚠️ Existe porque `new Date().toISOString()` convierte a UTC ANTES de recortar, y México está
 * en UTC-6: a partir de las 6 de la tarde el string resultante ya es el día siguiente. Eso hacía
 * que un gasto registrado a las 8 pm quedara guardado con la fecha de mañana, que el filtro
 * "hoy" de reportes arrancara en mañana y no encontrara lo de hoy, y que la fecha mínima de
 * recogida saltara un día. Mismo motivo por el que `new Date('2026-09-09')` tampoco sirve para
 * leer: ese literal se parsea como medianoche UTC y al pintarlo en local da el día anterior.
 */

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** `Date` → `yyyy-MM-dd` con el día tal como lo ve el usuario en su zona horaria. */
export function aIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

/** Hoy en `yyyy-MM-dd`, zona horaria local. */
export function hoyIso(): string {
  return aIsoLocal(new Date());
}

/** Hoy desplazado `dias` (puede ser negativo) en `yyyy-MM-dd`, zona horaria local. */
export function hoyMasDiasIso(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return aIsoLocal(d);
}

/** Mes en curso en `yyyy-MM`, zona horaria local. */
export function mesActualIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}`;
}

/** Día 1 del mes en curso en `yyyy-MM-dd`, zona horaria local. */
export function primerDiaMesIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-01`;
}
