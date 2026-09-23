/**
 * Modelos de los 4 endpoints nuevos del detalle del pedido (back 2026-09-22):
 * cambiar la forma de cobro y editar los artículos.
 *
 * Contrato completo en `CAMBIOS_FRONT.md` del repo del back.
 */

export type TipoPedido = 'NORMAL' | 'APARTADO' | 'FIADO';

/** `PUT /v1/pedidos/{id}/tipo` */
export interface CambiarTipoPedidoRequest {
  tipoPedido:    TipoPedido;
  /** Lo que el cliente paga en el momento del cambio. 0 o ausente = no cobra nada. */
  montoCobrado?: number;
  /** Texto libre que queda como nota del abono. */
  descripcion?:  string;
  usuarioId?:    number;
}

/** `POST /v1/pedidos/{id}/articulos` */
export interface AgregarArticuloRequest {
  varianteId:      number;
  cantidad?:       number;
  /**
   * Opcional. Si no viene, el back cobra el precio normal de catálogo. Solo acepta el normal
   * o el de rebaja — cualquier otro número lo rechaza con 400.
   */
  precioUnitario?: number;
}

/**
 * Qué hacer cuando el artículo nuevo rompe un combo de promoción.
 *
 * - `VALIDAR` (o sin mandar nada): el back contesta **409** con las dos opciones y no toca el
 *   pedido. Es lo que se manda la primera vez.
 * - `QUITAR_PROMOCION`: sale el combo entero y entra el artículo nuevo.
 * - `CONSERVAR_PROMOCION`: el combo queda intacto y el artículo se suma aparte.
 */
export type ModoCambio = 'VALIDAR' | 'QUITAR_PROMOCION' | 'CONSERVAR_PROMOCION';

/** `PUT /v1/pedidos/{id}/articulos/{detalleId}` */
export interface CambiarArticuloRequest {
  varianteId:      number;
  cantidad?:       number;
  precioUnitario?: number;
  modo?:           ModoCambio;
}

/** Una línea del combo, como la describe el 409. */
export interface LineaDelCombo {
  detalleId:      number;
  nombre:         string;
  cantidad:       number;
  precioUnitario: number;
}

/**
 * El cuerpo del **409**. No es un error: es una pregunta con dos salidas válidas, y el back
 * no elige solo porque las dos son decisiones de negocio legítimas.
 */
export interface OpcionesPromocion {
  mensaje:              string;
  promocionId:          number;
  promocionDescripcion: string;
  nombreArticuloNuevo:  string;
  importeDelCombo:      number;
  lineasDelCombo:       LineaDelCombo[];
}
