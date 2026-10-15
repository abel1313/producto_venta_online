/**
 * Todo lo que crean las pruebas lleva E2E en el código de barras y en el nombre, para
 * reconocerlo en QA y poder limpiarlo. El número sale de la hora, así que nunca se repite
 * entre corridas (el back busca el modelo por código de barras: repetirlo actualizaría uno
 * viejo en vez de crear uno nuevo).
 */
export function codigoE2E(): string {
  return `E2E${Date.now()}`;
}
