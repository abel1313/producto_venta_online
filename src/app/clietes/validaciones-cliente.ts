/**
 * Reglas de los datos de un cliente que se repiten en varias pantallas (Mis datos, ver cliente).
 *
 * QA 2026-10-14: en Mis datos el nombre y los apellidos solo aceptaban letras pegadas, sin
 * espacios, así que "María José" o "De la Cruz" salían en rojo con el aviso "Campo requerido"
 * aunque estuvieran llenos. Aquí se aceptan los nombres de verdad.
 */

/** Letras (con acentos, ñ y ü) y, entre palabras, espacio, apóstrofo, guion o punto. */
export const PATRON_NOMBRE = /^\s*[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+(?:[ '’.-]+[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+)*[.\s]*$/;

export const MENSAJE_NOMBRE = 'Solo letras y espacios, por ejemplo «María José» o «De la Cruz».';

/** Quita los espacios de más: "  maría   josé " → "maría josé". */
export function limpiarNombre(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

/** Deja solo dígitos y corta al máximo: "55 1234-56789" → "5512345678". */
export function soloDigitos(valor: unknown, maximo: number): string {
  return String(valor ?? '').replace(/\D/g, '').slice(0, maximo);
}

/**
 * Teléfono de 10 dígitos aunque lo peguen con espacios, guiones o lada del país:
 * "+52 55 1234 5678" → "5512345678", "521 55 1234 5678" → "5512345678".
 */
export function soloTelefono(valor: unknown): string {
  let digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length === 13 && digitos.startsWith('521')) digitos = digitos.slice(3);
  else if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2);
  return digitos.slice(0, 10);
}
