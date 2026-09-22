/**
 * `GET /v1/stock/producto/{productoId}` (back 2026-09-22).
 *
 * Para qué: al dar de alta artículos no había forma de ver cuánto stock queda sin repartir.
 * El admin escribía cantidades a ciegas, se pasaba del total del producto, y de ahí salían
 * los descuadres (el producto 269: 12 en total, sus modelos suman 18).
 */
export interface IStockDisponible {
  productoId:        number;
  nombreProducto:    string;
  /** Lo que tiene el producto. */
  stockTotal:        number;
  /** Lo ya repartido en modelos activos. */
  enVariantes:       number;
  variantesActivas:  number;
  /** Lo que está en modelos dados de baja — NO cuenta como repartido. */
  enVariantesDeBaja: number;
  /**
   * El número a mostrar. **Viene calculado: no lo recalcules en pantalla.** Si la pantalla
   * repitiera la resta, el día que cambie la regla habría dos versiones del mismo número.
   */
  disponible:        number;
  /** `true` si los modelos ya suman más que el producto: datos rotos, hay que avisarlo. */
  descuadrado:       boolean;
  /** Texto ya armado para mostrar tal cual. */
  mensaje:           string;
}
