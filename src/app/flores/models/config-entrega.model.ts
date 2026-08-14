/**
 * Configuración de entrega por tamaño de ramo.
 *
 * ⚠️ **CONTRATO PROVISIONAL — el back todavía no lo ha construido.** Está armado con lo que se
 * acordó con el dueño (ver `CAMBIOS_FRONT.md`, secciones del 2026-08-14 sobre entregas). Cuando
 * el back defina el modelo real, lo más probable es que solo cambien las URLs del servicio y
 * algún nombre de campo — la pantalla se queda igual.
 *
 * Hay una decisión abierta: puede que esto **no** sea una tabla aparte sino que cuelgue de
 * `CantidadFlorValida` (el 48 ya está dado de alta ahí con sus pliegos). Se les propuso así para
 * que el dueño no tenga que registrar el mismo tamaño en dos lugares y arriesgarse a que queden
 * desalineados.
 *
 * ### La regla que implementa
 *
 * El dueño da de alta, por tamaño, cuánto tarda en armarlo y a qué hora lo entrega — en su plazo
 * normal y en el urgente. Cuando un cliente pide una cantidad **sin configuración propia**, se usa
 * la del **tamaño configurado inmediato superior** (confirmado por el dueño: el redondeo es hacia
 * arriba, nunca hacia abajo — un ramo de 30 da más trabajo que uno de 24, así que tomar las
 * reglas del 24 lo comprometería a un plazo que no puede cumplir).
 */
export interface IConfigEntrega {
  id: number;
  /** El tamaño de ramo al que aplica. Sale del catálogo de cantidades ya dadas de alta. */
  cantidadFlorValidaId: number;
  /** Solo para mostrar en la lista sin tener que cruzar catálogos. */
  cantidadFlores?: number;

  // ── Entrega normal ────────────────────────────────────────────────────────
  /** Cuántos días tarda en armarlo sin prisa. */
  diasNormal: number;
  /** A qué hora del último día lo entrega (`HH:mm`). */
  horaEntregaNormal: string;

  // ── Entrega urgente ───────────────────────────────────────────────────────
  /**
   * Todo el bloque urgente es opcional: puede haber tamaños que simplemente **no** se pueden
   * apurar (el dueño lo dijo del ramo de 100 para el día siguiente). Si `diasUrgente` viene
   * `null`, ese tamaño no ofrece entrega urgente y el botón no se le muestra al cliente.
   */
  diasUrgente: number | null;
  horaEntregaUrgente: string | null;
  /**
   * Hora límite para hacer el pedido y que alcance el plazo urgente (`HH:mm`).
   *
   * ⚠️ No es cosmética: si el cliente pide a las 11:00 alcanza el plazo, pero a la 1:00 pm ya no
   * y el día de hoy deja de contar. **Y el pago también tiene que quedar antes de esta hora** —
   * si se pasa, se recotiza al precio urgente (regla del dueño).
   */
  horaLimitePedido: string | null;
  /** Lo que se cobra de más por el plazo urgente. */
  cargoUrgente: number | null;

  activo: boolean;
}

export interface IConfigEntregaRequest {
  id?: number;
  cantidadFlorValidaId: number;
  diasNormal: number;
  horaEntregaNormal: string;
  diasUrgente: number | null;
  horaEntregaUrgente: string | null;
  horaLimitePedido: string | null;
  cargoUrgente: number | null;
  activo: boolean;
}
