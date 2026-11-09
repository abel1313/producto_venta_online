/**
 * Cuentas de la calculadora de precios (puras, sin Angular): costo total, precio con margen, redondeo comercial, ganancia y margen real.
 * Fórmulas de «PROMPT MAESTRO — cálculo de precios para juguetes» (ver CALCULO_PRECIOS_JUGUETES.md en el back):
 *   CT = C + F + E            costo total = compra + transporte por pieza + otros gastos por pieza
 *   PV = CT / (1 − M)         precio de venta con margen M sobre el PRECIO (margen 30 % ⇒ de cada $100 cobrados, $30 son ganancia)
 * v2: la comisión de la terminal es un % DEL PRECIO (k), así que entra al divisor: PV = CT / (1 − M − k). La merma es un % del costo de compra.
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

/** Transporte por pieza repartido por VALOR de compra: gasto del viaje × (compra de esta pieza ÷ compra total del viaje). Una pieza cara carga más que una barata. 0 si faltan datos. */
export function transportePorValor(gastoTotal: number | null | undefined, valorCompraViaje: number | null | undefined, compraPieza: number | null | undefined): number {
  return gastoTotal && valorCompraViaje && compraPieza && gastoTotal > 0 && valorCompraViaje > 0 && compraPieza > 0 ? aDos(gastoTotal * compraPieza / valorCompraViaje) : 0;
}

/** Merma por pieza: % del costo de compra que se calcula que se daña o no se vende. */
export function mermaPorPieza(compra: number | null | undefined, mermaPct: number | null | undefined): number {
  return compra && mermaPct && compra > 0 && mermaPct > 0 ? aDos(compra * mermaPct / 100) : 0;
}

const pct = (v: number | null | undefined): number => (typeof v === 'number' && isFinite(v) && v > 0 ? v : 0);

/** Precio con el margen deseado (en %) y la comisión de la terminal (% del precio): PV = CT / (1 − M − k). null si el costo es 0 o los % no son válidos. */
export function precioConMargen(costo: number, margenPct: number | null | undefined, comisionPct: number | null | undefined = 0): number | null {
  if (!(costo > 0) || margenPct == null || !isFinite(margenPct) || margenPct < 0 || margenPct >= 100) return null;
  const divisor = 1 - margenPct / 100 - pct(comisionPct) / 100;
  return divisor > 0 ? aDos(costo / divisor) : null;
}

/** Cuánto hay que sumarle al costo para lograr ese margen sobre el precio (30 % de margen = 42.86 % de recargo). */
export function recargoSobreCosto(margenPct: number | null | undefined): number | null {
  return margenPct == null || !isFinite(margenPct) || margenPct < 0 || margenPct >= 100 ? null : aDos(margenPct / (100 - margenPct) * 100);
}

/** Precio más bajo que todavía deja `gananciaMin` pesos limpios por pieza (después de la comisión). null si no se puede. */
export function precioConGananciaMinima(costo: number, gananciaMin: number | null | undefined, comisionPct: number | null | undefined = 0): number | null {
  const d = 1 - pct(comisionPct) / 100;
  return costo > 0 && d > 0 ? aDos((costo + (gananciaMin && gananciaMin > 0 ? gananciaMin : 0)) / d) : null;
}

/** Redondeo comercial al múltiplo más cercano (hacia arriba o hacia abajo según el caso): 109.99 con paso 5 ⇒ 110. Paso 0 o inválido: sin redondeo. */
export function redondearA(precio: number, paso: number): number {
  if (!(precio > 0)) return 0;
  if (!(paso > 0)) return aDos(precio);
  return aDos(Math.round(precio / paso) * paso);
}

/** Ganancia en pesos y margen real (% del precio) de cobrar `precio` cuando la pieza cuesta `costo` (y la terminal se queda `comisionPct` % del precio). */
export function gananciaYMargen(precio: number, costo: number, comisionPct: number | null | undefined = 0): { ganancia: number; margenPct: number } {
  if (!(precio > 0)) return { ganancia: 0, margenPct: 0 };
  const ganancia = aDos(precio - costo - precio * pct(comisionPct) / 100);
  return { ganancia, margenPct: aDos((ganancia / precio) * 100) };
}

export interface IEscenarioPrecio { margenPct: number; exacto: number; redondeado: number; ganancia: number; margenReal: number; }

/** Los escenarios de margen (por defecto 20 / 25 / 30 / 35 %) con su precio exacto, el redondeado y la ganancia real al precio redondeado. */
export function escenarios(costo: number, paso: number, margenes: number[] = [20, 25, 30, 35], comisionPct: number | null | undefined = 0): IEscenarioPrecio[] {
  return margenes.flatMap(m => {
    const exacto = precioConMargen(costo, m, comisionPct);
    if (exacto == null) return [];
    const redondeado = redondearA(exacto, paso);
    const g = gananciaYMargen(redondeado, costo, comisionPct);
    return [{ margenPct: m, exacto, redondeado, ganancia: g.ganancia, margenReal: g.margenPct }];
  });
}
