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
}

export interface ILugarEntregaRequest {
  nombre: string;
  costoEnvio?: number | null;
  horasExtraAnticipacion?: number | null;
}
