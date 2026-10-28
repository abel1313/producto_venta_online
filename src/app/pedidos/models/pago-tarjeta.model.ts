/** Contrato de `/v1/pagos-tarjeta` (back: CAMBIOS_FRONT.md, sección "Cobro con tarjeta"). */

export type CanalPago = 'TERMINAL' | 'EN_LINEA';

export type EstadoCobro =
  | 'CREADO' | 'ENVIADO' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO' | 'EXPIRADO'
  | 'COBRADO_SIN_APLICAR' | 'DEVUELTO_PARCIAL' | 'DEVUELTO';

export interface ICobroTarjeta {
  id: number;
  pedidoId: number;
  canal: CanalPago;
  monto: number;
  cuotas: number;
  estado: EstadoCobro;
  /** Texto para mostrar tal cual ("en proceso", "aprobado"…). */
  estadoTexto: string;
  /** true = hay que seguir preguntando (cada ~3 s); con cualquier otro estado se deja de preguntar. */
  enProceso: boolean;
  venceEn: string;
  devuelto: number;
  restanteADevolver: number;
}

/** Los meses sin intereses de un pedido y, si no hay, por qué. */
export interface IOfertaMeses {
  /** Plazos disponibles (3, 6, 9, 12); vacío = solo de contado. */
  meses: number[];
  /** Por qué no hay meses (null cuando sí hay). */
  motivo: string | null;
  /** Artículos que impiden los meses. */
  articulosSinMeses: string[];
}

export interface IIniciarCobroTarjeta {
  pedidoId: number;
  canal: CanalPago;
  /** 1 = de contado; 3, 6, 9 o 12 = meses sin intereses. Nunca se manda monto: lo calcula el back. */
  cuotas: number;
}
