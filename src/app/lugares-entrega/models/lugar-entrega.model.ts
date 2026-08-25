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
}

export interface ILugarEntregaRequest {
  nombre: string;
  costoEnvio?: number | null;
  horasExtraAnticipacion?: number | null;
  latitud?: number | null;
  longitud?: number | null;
}
