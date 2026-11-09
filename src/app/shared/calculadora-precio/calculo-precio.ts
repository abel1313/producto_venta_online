/**
 * Cuentas de la calculadora de precios (puras, sin Angular): costo total, precio con margen, redondeo comercial, ganancia y margen real.
 * Fórmulas de «PROMPT MAESTRO — cálculo de precios para juguetes» (ver CALCULO_PRECIOS_JUGUETES.md en el back):
 *   CT = C + F + E            costo total = compra + transporte por pieza + otros gastos por pieza
 *   PV = CT / (1 − M)         precio de venta con margen M sobre el PRECIO (margen 30 % ⇒ de cada $100 cobrados, $30 son ganancia)
 * Todo es una ayuda: nada de aquí cambia el precio de un producto por sí solo.
 */

/** Dos decimales sin errores de punto flotante. */
export const aDos = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Costo total real de una pieza. Lo que venga vacío o inválido cuenta como 0. */
export function costoTotal(compra: number | null | undefined, transporte: number | null | undefined, otros: number | null | undefined): number {
  const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);
  return aDos(n(compra) + n(transporte) + n(otros));
}

/** Transporte por pieza = gasto total del viaje ÷ piezas que se trajeron. 0 si faltan datos. */
export function transportePorPieza(gastoTotal: number | null | undefined, piezas: number | null | undefined): number {
  return gastoTotal && piezas && gastoTotal > 0 && piezas > 0 ? aDos(gastoTotal / piezas) : 0;
}

/** Precio con el margen deseado (en %): PV = CT / (1 − M). Devuelve null si el costo es 0 o el margen no es válido (0 a menos de 100). */
export function precioConMargen(costo: number, margenPct: number | null | undefined): number | null {
  if (!(costo > 0) || margenPct == null || !isFinite(margenPct) || margenPct < 0 || margenPct >= 100) return null;
  return aDos(costo / (1 - margenPct / 100));
}

/** Redondeo comercial al múltiplo más cercano (hacia arriba o hacia abajo según el caso): 109.99 con paso 5 ⇒ 110. Paso 0 o inválido: sin redondeo. */
export function redondearA(precio: number, paso: number): number {
  if (!(precio > 0)) return 0;
  if (!(paso > 0)) return aDos(precio);
  return aDos(Math.round(precio / paso) * paso);
}

/** Ganancia en pesos y margen real (% del precio) de cobrar `precio` cuando la pieza cuesta `costo`. */
export function gananciaYMargen(precio: number, costo: number): { ganancia: number; margenPct: number } {
  if (!(precio > 0)) return { ganancia: 0, margenPct: 0 };
  const ganancia = aDos(precio - costo);
  return { ganancia, margenPct: aDos((ganancia / precio) * 100) };
}

export interface IEscenarioPrecio { margenPct: number; exacto: number; redondeado: number; ganancia: number; margenReal: number; }

/** Los escenarios de margen (por defecto 20 / 25 / 30 / 35 %) con su precio exacto, el redondeado y la ganancia real al precio redondeado. */
export function escenarios(costo: number, paso: number, margenes: number[] = [20, 25, 30, 35]): IEscenarioPrecio[] {
  return margenes.flatMap(m => {
    const exacto = precioConMargen(costo, m);
    if (exacto == null) return [];
    const redondeado = redondearA(exacto, paso);
    const g = gananciaYMargen(redondeado, costo);
    return [{ margenPct: m, exacto, redondeado, ganancia: g.ganancia, margenReal: g.margenPct }];
  });
}
