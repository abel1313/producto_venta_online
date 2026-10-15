// Catálogo dinámico de variables de personalización visual -- ver GET /v1/tema-variable/activo
// y el resto del CRUD en el backend (TemaVariable). Cada fila ES una variable: agregar una nueva
// no requiere tocar código en ningún lado, ni back ni front -- basta con que su `clave` coincida
// con un var(--esa-clave) que ya exista en algún .scss para que tenga efecto visual.
export interface ITemaVariable {
  id?: number;
  clave: string;               // nombre del custom property CSS SIN "--" (ej. "app-bg")
  etiqueta: string;            // texto legible para la pantalla de Personalización
  grupo?: string | null;       // agrupa la pantalla en secciones (ej. "Marca", "Card")
  // texto = se aplica tal cual (tipo de letra, degradado, sombra, var(--otra)); numero = px.
  tipo: 'color' | 'numero' | 'seleccion' | 'texto';
  valorClaro: string;
  valorOscuro?: string | null; // NULL = se usa valorClaro también de noche (variables estructurales)
  orden?: number | null;
}

// El dueño elige de una lista para card-shadow -- no escribe box-shadow a mano. "linea" es la de
// Jade: un contorno de 1px del color del borde de la card, sin sombra difusa.
export const SOMBRAS_CARD: Record<string, string> = {
  linea:  '0 0 0 1px var(--card-border)',
  suave:  '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
  media:  '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
  fuerte: '0 2px 6px rgba(0,0,0,0.12), 0 10px 32px rgba(0,0,0,0.10)',
};

// Opciones de las variables tipo "seleccion", por clave.
//  - estilo: "jade" enciende la capa de letra/campos/tablas/botones de tema-jade.scss;
//    "clasico" la apaga y la app se ve con la letra y los tamaños de cada pantalla.
export const OPCIONES_SELECCION: Record<string, string[]> = {
  'card-shadow': Object.keys(SOMBRAS_CARD),
  'estilo': ['jade', 'clasico'],
};

// Claves que además de su propio --custom-property alimentan uno o más alias que otras hojas de
// estilo consumen con otro nombre pero EL MISMO valor -- así el dueño edita una sola fila en
// Personalización y cambia todos los lugares que visualmente son "lo mismo".
export const ALIAS_LEGACY: Record<string, string[]> = {
  'app-bg': ['--page-bg', '--color-bg'],
  'app-text': ['--header-text', '--input-text', '--color-text'],
  'app-text-muted': ['--header-text-muted', '--color-text-secondary'],
  'app-border': ['--input-border', '--color-border'],
  'card-body-bg': ['--card-bg', '--app-surface', '--color-surface', '--form-bg'],
  'sb-body-bg': ['--sb-bg'],
  'form-section-bg': ['--app-surface-2', '--color-surface-alt'],
  'app-tint': ['--app-accent-soft', '--table-row-active'],
  'app-glass': ['--header-brand'],
};

// Variables que viven como "r, g, b" para usarse en rgba(var(--x-rgb), alfa) -- 371 usos en las
// pantallas. Se calculan solas del color de la fila; antes estaban fijas en styles.scss y al
// escoger otro diseño los brillos y sombras se quedaban con el verde de fábrica.
export const RGB_DERIVADOS: Record<string, string[]> = {
  'brand-1': ['--app-accent-rgb', '--bs-primary-rgb', '--bs-link-color-rgb'],
  'sb-body-bg': ['--sb-bg-rgb'],
};

/** "#2d7560" | "#fff" | "rgba(22,24,38,0.6)" | "rgb(1,2,3)" -> "45, 117, 96". null si no es un color fijo. */
export function aRgb(valor: string): string | null {
  const v = valor.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  return rgb ? `${rgb[1]}, ${rgb[2]}, ${rgb[3]}` : null;
}

// ── Menú de opciones de las listas (2026-10-13) ─────────────────────────────────────────────
// El menú que se abre en un <select> lo dibuja el navegador, no la página: según el navegador
// respeta el fondo y la letra de cada <option>, solo la letra (y pinta el fondo claro u oscuro
// según `color-scheme`), o ninguno de los dos. Si esas tres cosas no coinciden, sale letra clara
// sobre fondo blanco (lo que vio el dueño con los diseños de estilo Clásico de noche: el fondo del
// campo es casi transparente, rgba(255,255,255,0.05), y el menú quedaba blanco).
// Por eso el menú usa un trío propio que siempre coincide: fondo SÓLIDO, letra que contraste con
// ese fondo y `color-scheme` del mismo lado (claro u oscuro). Se calcula de los colores del campo.

export interface ColorRgba { r: number; g: number; b: number; a: number; }
export interface ColoresMenu { fondo: string; letra: string; esquema: 'light' | 'dark'; }

/** "rgb(1, 2, 3)" | "rgba(1, 2, 3, 0.5)" | "rgb(1 2 3 / 0.5)" (lo que da getComputedStyle). */
export function leerRgba(valor: string): ColorRgba | null {
  const m = /rgba?\(([^)]+)\)/i.exec(valor || '');
  if (!m) return null;
  const n = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (n.length < 3 || n.some(x => Number.isNaN(x))) return null;
  return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
}

/** Un color (con transparencia) encima de otro sólido: el color que se ve. */
export function componer(arriba: ColorRgba, abajo: ColorRgba): ColorRgba {
  const a = arriba.a;
  return { r: arriba.r * a + abajo.r * (1 - a), g: arriba.g * a + abajo.g * (1 - a), b: arriba.b * a + abajo.b * (1 - a), a: 1 };
}

export function luminancia(c: ColorRgba): number {
  const canal = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
}

/** Contraste entre dos colores sólidos (1 a 21). Texto normal legible: 4.5 o más. */
export function contraste(x: ColorRgba, y: ColorRgba): number {
  const a = luminancia(x), b = luminancia(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const aCss = (c: ColorRgba) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
const NEGRO: ColorRgba = { r: 17, g: 24, b: 39, a: 1 };
const BLANCO: ColorRgba = { r: 255, g: 255, b: 255, a: 1 };

/**
 * Colores del menú a partir de los del campo ya resueltos por el navegador: el fondo del campo
 * encima del de la página (queda sólido), la letra del campo si contrasta (si no, negro o blanco,
 * el que más contraste) y el esquema según qué tan claro es ese fondo.
 */
export function coloresDelMenu(fondoCampo: string, letraCampo: string, fondoPagina: string): ColoresMenu | null {
  const campo = leerRgba(fondoCampo), letra = leerRgba(letraCampo);
  let pagina = leerRgba(fondoPagina);
  if (!campo || !letra) return null;
  if (!pagina || pagina.a === 0) pagina = BLANCO;
  if (pagina.a < 1) pagina = componer(pagina, BLANCO);
  const fondo = componer(campo, pagina);
  let texto = letra.a < 1 ? componer(letra, fondo) : letra;
  if (contraste(texto, fondo) < 4.5) {
    texto = contraste(NEGRO, fondo) >= contraste(BLANCO, fondo) ? NEGRO : BLANCO;
  }
  // 0.179: el punto donde el negro y el blanco contrastan igual con el fondo.
  return { fondo: aCss(fondo), letra: aCss(texto), esquema: luminancia(fondo) < 0.179 ? 'dark' : 'light' };
}
