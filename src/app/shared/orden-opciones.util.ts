// Orden de las opciones de los filtros de talla / color / marca: primero las que empiezan con
// letra y después las que empiezan con número (pedido del dueño 2026-10-14).
const TALLAS_CONOCIDAS = ['XXS', 'XS', 'CH', 'S', 'M', 'G', 'L', 'XL', 'XXL', 'XXXL', 'U', 'UNITALLA'];

/** Normaliza una opción para mostrarla y compararla: sin espacios de más y en MAYÚSCULAS. */
export function normalizarOpcion(valor: string): string {
  return (valor ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Letras primero (las tallas conocidas en su orden natural, luego A–Z) y después los números de menor a mayor. */
export function ordenarOpciones(opciones: string[]): string[] {
  const unicas = Array.from(new Set((opciones ?? []).map(normalizarOpcion).filter(o => o !== '')));
  const empiezaConNumero = (o: string) => /^\d/.test(o);
  const letras = unicas.filter(o => !empiezaConNumero(o));
  const numeros = unicas.filter(empiezaConNumero);
  const posicion = (o: string) => { const i = TALLAS_CONOCIDAS.indexOf(o); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  letras.sort((a, b) => (posicion(a) - posicion(b)) || a.localeCompare(b, 'es'));
  numeros.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  return [...letras, ...numeros];
}
