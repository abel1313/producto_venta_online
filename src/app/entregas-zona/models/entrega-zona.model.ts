export interface IEntregaZonaPendiente {
  pedidoId: number;
  nombreCliente: string;
  correo: string | null;
  total: number;
  fechaPedido: string;
}

export interface IEntregaZonaSemana {
  // Rango de fecha de PEDIDO que se está mostrando. Antes la pantalla solo podía ver la
  // semana en curso y el back la calculaba solo; ahora se elige con los dos calendarios.
  desde: string;
  hasta: string;
  /** @deprecated el back los sigue mandando iguales a desde/hasta por compatibilidad. */
  lunes?: string;
  /** @deprecated usar `hasta`. */
  viernes?: string;
  fechaSugerida: string | null;
  pedidos: IEntregaZonaPendiente[];
}

export interface IProgramarEntregaZonaRequest {
  /** Fecha en la que se entregará -- es la que va en el correo al cliente. */
  fecha: string;
  hora: string;
  puntoEncuentro: string;
  /**
   * Punto exacto del encuentro marcado en el mapa. Opcional -- `puntoEncuentro` en texto libre
   * sigue siendo lo obligatorio. Cuando viene, el back lo copia a cada pedido avisado y el
   * cliente ve un botón "Cómo llegar" en su pedido y en el correo.
   */
  latitud?: number | null;
  longitud?: number | null;
  // Se manda el MISMO rango que se listó para que el correo le llegue exactamente a los
  // pedidos que el admin tenía a la vista, no a los que el back recalcule por su cuenta.
  desde?: string;
  hasta?: string;
}
