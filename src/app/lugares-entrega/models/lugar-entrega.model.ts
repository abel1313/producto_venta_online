// Catálogo de lugares de entrega — usado para filtrar pedidos por zona en vez de buscar
// en el texto libre de direccionEntrega

export interface ILugarEntrega {
  id:     number;
  nombre: string;
  /**
   * Costo de envío a esta zona.
   *
   * ⚠️ **Solo lo usa el módulo de flores eternas.** El back reutilizó `LugarEntrega` para no
   * crear un catálogo de zonas paralelo, pero ningún flujo del checkout normal de la tienda lee
   * este campo — y no debe empezar a leerlo sin que el dueño lo pida: cobrar envío en la tienda
   * general es una decisión de negocio que no se ha tomado.
   */
  costoEnvio?: number | null;
  /**
   * Horas que se SUMAN al mínimo de anticipación por ser una zona lejana o complicada.
   * Solo aplica a flores eternas. `null` = no agrega tiempo.
   */
  horasExtraAnticipacion?: number | null;
  /**
   * Coordenadas del centro de la zona (2026-08-25) — usadas para recentrar el mapa de
   * `SelectorUbicacionComponent` al elegir esta zona en vez de dejarlo siempre en el punto
   * genérico fijo. `null` en zonas viejas que nunca capturaron el dato: en ese caso el mapa
   * debe caer al centro genérico (fallback), no a `null`/`0,0`.
   */
  latitud?: number | null;
  longitud?: number | null;
  /**
   * Marca la fila de este catálogo que representa "recoger en el local" (2026-09-04), a
   * diferencia de una zona de entrega real (Tejupilco, Zacazonapan, etc.). El checkout de
   * `tienda/carrito` usa esto para saber cuándo mostrar el calendario de fecha de recogida —
   * debe haber como mucho una fila en `true`.
   */
  esRecogerEnTienda?: boolean | null;
  /**
   * Día de la semana (recurrente) en que se hace el viaje de entrega a esta zona — 1=lunes .. 7=domingo
   * (2026-09-04, "Entregas por zona"). `null` = sin configurar (o "recoger en tienda", no aplica).
   */
  diaEntregaSemanal?: number | null;
}

export interface ILugarEntregaRequest {
  nombre: string;
  costoEnvio?: number | null;
  horasExtraAnticipacion?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  esRecogerEnTienda?: boolean | null;
  diaEntregaSemanal?: number | null;
}

// Anillo (rango de distancia) de cobro dentro de una zona -- ver DISENO_ZONAS_POR_ANILLO.md en
// el repo compartido. Un LugarEntrega puede tener 0 anillos (se comporta igual que hoy, costo
// fijo de la zona) o varios, cada uno con su propio radio y precio.
export interface IAnilloLugarEntrega {
  id: number;
  lugarEntregaId: number;
  radioMetros: number;
  costoEnvio: number;
  orden?: number | null;
}

export interface IAnilloLugarEntregaRequest {
  radioMetros: number;
  costoEnvio: number;
  orden?: number | null;
}

// Respuesta de POST /{id}/calcular-costo -- dentroDeRango=false significa que el punto marcado
// en el mapa quedó fuera de todos los anillos configurados para la zona: el checkout debe
// bloquear el avance en ese caso.
export interface ICalcularCostoEnvioResponse {
  dentroDeRango: boolean;
  costoEnvio: number | null;
  anilloId: number | null;
}
