/**
 * Formatea una hora "HH:mm" (lo que guarda el back y lo que entrega un `<input type="time">`)
 * a algo que se lea sin pensar: **"6:00 p.m."** en vez de "18:00".
 *
 * ⚠️ Existe porque `<input type="time">` se pinta según la configuración del navegador y del
 * sistema: en unas máquinas muestra 24 horas y en otras 12 sin el a.m./p.m. a la vista, así que
 * el mismo horario se leía distinto según quién lo abriera. El texto de al lado no depende de
 * eso — siempre dice a.m. o p.m.
 *
 * Casos borde que sí importan: `12:00` es mediodía (**p.m.**) y `00:30` es de madrugada
 * (**12:30 a.m.**) — el `% 12` a secas daría "0:30", que no existe.
 */
export function horaLegible(hhmm?: string | null): string {
  if (!hhmm) return '';

  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm).trim());
  if (!m) return String(hhmm);            // no es "HH:mm": se devuelve tal cual

  const horas = Number(m[1]);
  const minutos = m[2];
  if (isNaN(horas) || horas > 23) return String(hhmm);

  const sufijo = horas < 12 ? 'a.m.' : 'p.m.';
  const h12 = horas % 12 || 12;           // 0 → 12 (medianoche), 12 → 12 (mediodía)

  return `${h12}:${minutos} ${sufijo}`;
}
