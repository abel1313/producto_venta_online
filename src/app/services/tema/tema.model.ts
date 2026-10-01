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
