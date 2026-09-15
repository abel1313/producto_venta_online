/**
 * Medidas y colores de la ruleta — compartido por las cuatro pantallas que la dibujan
 * (agregar-rifa, rifa-mes, boletos-rifa y la ruleta pública).
 *
 * El problema que resuelve: la ruleta pintaba el NOMBRE COMPLETO dentro de cada rebanada
 * con un tamaño fijo de canvas. Con pocos participantes se leía; pasando de ~15 boletos
 * los nombres se encimaban unos con otros hasta volverse una mancha, y como el canvas no
 * crecía, la ruleta se veía cada vez más apretada. Ahora cada participante lleva un NÚMERO
 * y es ese número el que va en la rebanada; el nombre vive en la lista de abajo, junto al
 * mismo número y el mismo color. Así la rebanada solo tiene que ser legible para 1-3 dígitos.
 */

/**
 * Paleta fija de tonos medios/oscuros: el número se pinta en blanco encima, así que un
 * color claro lo dejaría ilegible. Antes los colores se sacaban con Math.random() en hex,
 * lo que producía tonos casi blancos (número invisible), parejas casi idénticas entre dos
 * personas, y un color distinto en cada giro — con eso la lista de abajo no podía servir
 * de leyenda. Estos son estables: al mismo número siempre le toca el mismo color.
 */
const PALETA = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#008080', '#9a6324', '#800000', '#808000', '#000075',
  '#d946a0', '#0f766e', '#b45309', '#4d7c0f', '#7c3aed',
  '#be123c', '#1d4ed8', '#c2410c', '#15803d', '#6d28d9'
];

export interface IMedidasRuleta {
  /** Lado del canvas en px (es cuadrado). La ruleta crece con la cantidad de rebanadas. */
  lado: number;
  /** Tamaño de fuente del número dentro de la rebanada. */
  fuente: number;
  /** false cuando ni un número de dos dígitos cabe: se pinta solo color y manda la leyenda. */
  mostrarNumeros: boolean;
}

/**
 * Tamaño de la ruleta según cuántas rebanadas hay y qué tan ancha es la pantalla.
 *
 * En PC crece hasta 760px: mientras más participantes, más grande, porque el espacio existe.
 * En celular no puede crecer — cabe lo que cabe en la pantalla — así que ahí se queda compacta
 * y lo que se ajusta es el número: se va achicando, y si ya ni achicado cabe se deja solo el
 * color y el número se busca en la lista.
 */
export function medidasRuleta(rebanadas: number, anchoVentana: number): IMedidasRuleta {
  const n = Math.max(1, rebanadas);
  const esCelular = anchoVentana < 640;

  const minimo = esCelular ? 260 : 340;
  // -48px por el padding de la tarjeta; nunca más ancha que la pantalla.
  const maximo = esCelular ? Math.max(minimo, Math.min(anchoVentana - 48, 420)) : 760;
  const lado = Math.round(Math.min(maximo, Math.max(minimo, 13 * n)));

  // El número se dibuja pegado al BORDE (anchor 'end' + align 'start' en el componente),
  // a ~0.82 del radio. Ahí el arco de cada rebanada mide 2·π·(0.82·lado/2)/n, casi el doble
  // que a media altura: dibujarlo al centro amontonaba todos los números en el mismo punto
  // y se encimaban unos con otros, que es justo lo que se quería evitar.
  const arco = (0.82 * Math.PI * lado) / n;

  // El número se pinta horizontal, no girado, así que en las rebanadas de arriba y abajo
  // lo que compite por el arco es su ANCHO: unos 1.2× el tamaño de fuente con dos dígitos.
  return {
    lado,
    fuente: Math.round(Math.min(18, Math.max(8, arco * 0.6))),
    mostrarNumeros: arco >= 11
  };
}

/**
 * Color de un participante por su número (1-based). Al agotarse la paleta se repite pero
 * más oscura, para que dos personas con el mismo tono no se confundan de un vistazo.
 */
export function colorRuleta(numero: number): string {
  const i = Math.max(0, numero - 1);
  const base = PALETA[i % PALETA.length];
  const vuelta = Math.floor(i / PALETA.length);
  return vuelta === 0 ? base : oscurecer(base, vuelta * 0.18);
}

/**
 * Reparte los números entre los participantes, ordenados por id ascendente.
 *
 * El orden es por id y no por cantidad de boletos a propósito: los boletos cambian con cada
 * giro, y si el número se recalculara por eso, quien era el 3 pasaría a ser el 5 a media rifa.
 * Por id, cada participante conserva su número de principio a fin aunque los demás se vayan
 * descartando.
 */
export function numerosDeParticipantes(ids: number[]): Map<number, number> {
  const unicos = Array.from(new Set(ids)).sort((a, b) => a - b);
  return new Map(unicos.map((id, i) => [id, i + 1]));
}

function oscurecer(hex: string, factor: number): string {
  const f = Math.min(0.8, Math.max(0, factor));
  const canal = (desde: number) => {
    const v = Math.round(parseInt(hex.slice(desde, desde + 2), 16) * (1 - f));
    return v.toString(16).padStart(2, '0');
  };
  return `#${canal(1)}${canal(3)}${canal(5)}`;
}
