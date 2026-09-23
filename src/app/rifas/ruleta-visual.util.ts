import { ArcElement, Chart, Plugin } from 'chart.js';

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
  /**
   * A qué fracción del radio va el número. Con uno solo, todos van a la misma altura; con
   * varios, las rebanadas seguidas se turnan de adentro hacia afuera para no encimarse.
   */
  anillos: number[];
  /** false cuando ni escalonados caben: se pinta solo color y manda la leyenda. */
  mostrarNumeros: boolean;
}

/**
 * Alturas posibles para los números, de menos a más escalonado.
 *
 * El número va acostado sobre su rebanada (del centro hacia afuera), así que lo que compite
 * por el ancho de la rebanada es su ALTO, no su largo. Cuando ni así cabe en una sola vuelta,
 * la rebanada 1 lo pone abajo, la 2 un poco más arriba, la 3 más arriba y vuelve a empezar:
 * dos números vecinos nunca quedan a la misma altura, y cada uno tiene el ancho de 2 o 3
 * rebanadas para él solo.
 */
const ANILLOS: number[][] = [[0.8], [0.58, 0.82], [0.5, 0.67, 0.84]];

/**
 * Tamaño de la ruleta según cuántas rebanadas hay y qué tan ancha es la pantalla.
 *
 * En PC crece hasta 760px: mientras más participantes, más grande, porque el espacio existe.
 * En celular no puede crecer — cabe lo que cabe en la pantalla — así que ahí se queda compacta
 * y lo que se ajusta es el número: se achica y se escalona, y si ya ni así cabe se deja solo
 * el color y el número se busca en la lista.
 */
export function medidasRuleta(rebanadas: number, anchoVentana: number): IMedidasRuleta {
  const n = Math.max(1, rebanadas);
  const esCelular = anchoVentana < 640;

  const minimo = esCelular ? 260 : 340;
  // -48px por el padding de la tarjeta; nunca más ancha que la pantalla.
  const maximo = esCelular ? Math.max(minimo, Math.min(anchoVentana - 48, 420)) : 760;
  const lado = Math.round(Math.min(maximo, Math.max(minimo, 13 * n)));

  let mejor = { anillos: ANILLOS[0], fuente: 0 };
  for (const anillos of ANILLOS) {
    // Espacio de cada número en el anillo más apretado, el de adentro: el arco de su rebanada
    // por la cantidad de anillos, porque sus vecinos van a otra altura.
    const arco = (anillos.length * Math.PI * anillos[0] * lado) / n;
    const fuente = Math.min(13, Math.floor(arco * 0.65));
    if (fuente > mejor.fuente) mejor = { anillos, fuente };
    if (fuente >= 9) break;
  }

  return {
    lado,
    fuente: Math.max(7, mejor.fuente),
    anillos: mejor.anillos,
    mostrarNumeros: mejor.fuente >= 7
  };
}

/**
 * Le pone a la ruleta su ancho ANTES de dibujarla.
 *
 * El contenedor toma su ancho de `medidas.lado` por binding, pero Angular lo aplica después
 * de que Chart.js ya midió el canvas: la ruleta nacía con el ancho anterior (340px) y se
 * quedaba chica aunque el contenedor creciera. Al reiniciar sí salía grande porque para
 * entonces el binding ya tenía el valor bueno.
 */
export function aplicarLadoRuleta(canvas: HTMLCanvasElement, medidas: IMedidasRuleta): void {
  if (canvas.parentElement) canvas.parentElement.style.maxWidth = `${medidas.lado}px`;
}

/** Dibuja el número de cada rebanada, acostado sobre ella, a la altura que le toca. */
export function numerosEnRuleta(medidas: IMedidasRuleta): Plugin<'pie'> {
  return {
    id: 'numerosEnRuleta',
    afterDatasetsDraw(chart) {
      if (!medidas.mostrarNumeros) return;
      const etiquetas = chart.data.labels ?? [];
      const { ctx } = chart;
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${medidas.fuente}px ${Chart.defaults.font.family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      (chart.getDatasetMeta(0).data as ArcElement[]).forEach((arco, i) => {
        const { x, y, startAngle, endAngle, outerRadius } =
          arco.getProps(['x', 'y', 'startAngle', 'endAngle', 'outerRadius'], true);
        const medio = (startAngle + endAngle) / 2;
        const r = outerRadius * medidas.anillos[i % medidas.anillos.length];
        ctx.save();
        ctx.translate(x + Math.cos(medio) * r, y + Math.sin(medio) * r);
        // En la mitad izquierda se voltea para que no quede de cabeza.
        ctx.rotate(Math.cos(medio) < 0 ? medio + Math.PI : medio);
        ctx.fillText(String(etiquetas[i] ?? ''), 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
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

/**
 * Las rebanadas revueltas. En orden de alta los boletos de una misma persona quedaban juntos
 * y los números salían seguidos (1 1 2 2 3…), que no parece sorteo.
 *
 * El revuelto es fijo por rifa (la semilla es su id): el admin y la ruleta pública ven la
 * misma rueda y no cambia al recargar. No toca la probabilidad: cada boleto sigue siendo una
 * rebanada del mismo tamaño, y quién gana lo decide el back — la animación solo busca la
 * rebanada del boleto que salió.
 */
export function revolverRuleta<T>(slots: T[], semilla: number | null | undefined, idDe: (s: T) => number): T[] {
  // Se ordena antes de revolver para que el resultado no dependa del orden en que llegaron.
  const revueltos = [...slots].sort((a, b) => idDe(a) - idDe(b));
  const azar = generadorConSemilla(semilla ?? 0);
  for (let i = revueltos.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [revueltos[i], revueltos[j]] = [revueltos[j], revueltos[i]];
  }
  return revueltos;
}

/** mulberry32: la misma semilla da siempre la misma secuencia. */
function generadorConSemilla(semilla: number): () => number {
  let estado = (Math.imul(semilla, 2654435761) >>> 0) || 1;
  return () => {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oscurecer(hex: string, factor: number): string {
  const f = Math.min(0.8, Math.max(0, factor));
  const canal = (desde: number) => {
    const v = Math.round(parseInt(hex.slice(desde, desde + 2), 16) * (1 - f));
    return v.toString(16).padStart(2, '0');
  };
  return `#${canal(1)}${canal(3)}${canal(5)}`;
}
