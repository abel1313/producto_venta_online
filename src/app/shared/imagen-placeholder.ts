/**
 * Imagen de reemplazo cuando la del producto no carga.
 *
 * ⚠️ Es un **data URI**, no una ruta a un archivo, y eso es a propósito.
 *
 * Antes se usaba `'assets/img/no-image.png'`, **que no existe en el proyecto**. El resultado era
 * un bucle infinito: la imagen del producto fallaba → el handler ponía el png → ese png daba 404
 * → volvía a disparar el handler → lo ponía otra vez… El dueño lo cazó en `/pedidos/mis-pedidos`
 * con **más de 50 peticiones** al mismo archivo inexistente, en un pedido de flores (los
 * productos sombra del módulo no tienen imagen, así que fallan siempre).
 *
 * Un data URI **no puede dar 404**, así que el bucle es imposible por construcción — no depende
 * de que alguien se acuerde de subir un archivo.
 */
export const IMAGEN_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E" +
  "%3Crect width='120' height='120' fill='%23e8eeea'/%3E" +
  "%3Ccircle cx='45' cy='44' r='9' fill='%23b9c9c0'/%3E" +
  "%3Cpath d='M26 84l22-27 16 19 13-15 17 23z' fill='%23b9c9c0'/%3E%3C/svg%3E";

/**
 * Handler de `(error)` para cualquier `<img>` de producto.
 *
 * Además del data URI, **desconecta el handler** (`onerror = null`) antes de reemplazar la
 * fuente: doble seguro para que ni siquiera un reemplazo roto en el futuro pueda encadenar otro
 * error. Es el mismo motivo por el que existe este archivo.
 */
export function onImagenError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.onerror = null;
  img.src = IMAGEN_PLACEHOLDER;
}
