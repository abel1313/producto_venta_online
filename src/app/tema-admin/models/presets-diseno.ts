// Diseños predefinidos para la pantalla de Personalización -- 3 paletas completas (Marca,
// Página, Card, Tablas, Menú lateral, Formularios), cada una con su par claro ☀️ / oscuro 🌙, que
// el dueño puede aplicar de un clic sin editar variable por variable. Colores de Marca/Página/
// Card/Tablas en modo claro tomados 1:1 del mockup comparativo que se le mostró (3 direcciones de
// estilo sobre un card de pedido real: navbar, botones, header/body/footer).
//
// Criterio para el modo oscuro de cada preset (mismo que ya se usa en el resto de la app):
// - Marca (brand-1/2/3) se invierte a blanco/gris claro en oscuro -- así los botones normales
//   siguen resaltando sobre fondo negro, igual que en el resto de la app hoy.
// - Página/Tablas/Menú lateral/Formularios usan el mismo esquema neutro casi-negro que ya existe
//   por defecto en oscuro (probado en toda la app) -- no cambia de un preset a otro.
// - El header de las cards SÍ mantiene el color de marca propio de cada preset, fijo de día y de
//   noche (mismo criterio que ya se aplicó esta sesión a card-header-bg y al chatbot) -- es lo que
//   hace reconocible cada diseño también en oscuro.
export interface ValorPreset {
  claro: string;
  oscuro: string;
}

export interface PresetDiseno {
  id: string;
  nombre: string;
  descripcion: string;
  valores: Record<string, ValorPreset>;
}

// Bloque común de modo oscuro (Página/Tablas/Menú lateral/Formularios/Marca) -- igual en los 3
// presets, es el mismo esquema neutro que ya usa hoy el modo oscuro por defecto.
const OSCURO_NEUTRO_BASE = {
  'brand-1': '#FFFFFF',
  'brand-2': '#C7C7CC',
  'brand-3': '#8E8E93',
  'app-accent-ink': '#000000',
  'app-bg': '#000000',
  'app-text': '#E9E9EC',
  'app-text-muted': '#9A9AA0',
  'app-border': '#2A2A2E',
  'card-body-bg': '#0C0C0C',
  'card-footer-bg': '#0C0C0C',
  'card-border': '#2A2A2E',
  'table-header-bg': '#151517',
  'table-header-text': '#9A9AA0',
  'table-row-hover': '#151517',
  'table-border': '#2A2A2E',
  'form-section-bg': '#151517',
  'input-bg': 'rgba(255,255,255,0.05)',
  'sb-header-bg': 'rgba(0,0,0,0.92)',
  'sb-body-bg': 'rgba(0,0,0,0.92)',
  'sb-footer-bg': 'rgba(0,0,0,0.92)',
  'sb-text': '#E9E9EC',
  'sb-border': 'rgba(255,255,255,0.08)',
} as const;

function construirValores(
  claro: Record<string, string>,
  headerOscuro: string
): Record<string, ValorPreset> {
  const valores: Record<string, ValorPreset> = {};
  for (const clave of Object.keys(claro)) {
    const oscuroBase = (OSCURO_NEUTRO_BASE as Record<string, string>)[clave];
    valores[clave] = { claro: claro[clave], oscuro: oscuroBase ?? claro[clave] };
  }
  // El header de card mantiene el color de marca del preset también en oscuro (fijo, no invierte).
  valores['card-header-bg'] = { claro: claro['card-header-bg'], oscuro: headerOscuro };
  valores['card-header-text'] = { claro: claro['card-header-text'], oscuro: '#FFFFFF' };
  return valores;
}

export const PRESETS_DISENO: PresetDiseno[] = [
  {
    id: 'jade-profundo',
    nombre: 'Jade profundo elevado',
    descripcion: 'Verde jade oscuro con acentos crema -- el más cercano al verde actual.',
    valores: construirValores(
      {
        'brand-1': '#0B4D3A',
        'brand-2': '#093C2D',
        'brand-3': '#062A1F',
        'app-accent-ink': '#FFFFFF',
        'app-bg': '#FAF7F0',
        'app-text': '#152018',
        'app-text-muted': '#8A9690',
        'app-border': '#E4DCC8',
        'card-header-bg': '#0B4D3A',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#FFFFFF',
        'card-footer-bg': '#FFFFFF',
        'card-border': '#E4DCC8',
        'table-header-bg': '#EFE9DC',
        'table-header-text': '#8A9690',
        'table-row-hover': '#EFE9DC',
        'table-border': '#E4DCC8',
        'form-section-bg': '#EFE9DC',
        'input-bg': '#FFFFFF',
        'sb-header-bg': 'rgba(250,247,240,0.97)',
        'sb-body-bg': 'rgba(250,247,240,0.97)',
        'sb-footer-bg': 'rgba(250,247,240,0.97)',
        'sb-text': '#152018',
        'sb-border': '#E4DCC8',
      },
      '#0B4D3A'
    ),
  },
  {
    id: 'neutros-calidos',
    nombre: 'Neutros cálidos de boutique',
    descripcion: 'Terracota y beige -- look de tienda de ropa/boutique, más cálido.',
    valores: construirValores(
      {
        'brand-1': '#B5654A',
        'brand-2': '#96503A',
        'brand-3': '#7A3F2E',
        'app-accent-ink': '#FFFFFF',
        'app-bg': '#EDE6D8',
        'app-text': '#2B2620',
        'app-text-muted': '#9C8E7C',
        'app-border': '#DDD1BC',
        'card-header-bg': '#B5654A',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#FFFCF6',
        'card-footer-bg': '#FFFCF6',
        'card-border': '#DDD1BC',
        'table-header-bg': '#E2D9C7',
        'table-header-text': '#9C8E7C',
        'table-row-hover': '#E2D9C7',
        'table-border': '#DDD1BC',
        'form-section-bg': '#E2D9C7',
        'input-bg': '#FFFCF6',
        'sb-header-bg': 'rgba(237,230,216,0.97)',
        'sb-body-bg': 'rgba(237,230,216,0.97)',
        'sb-footer-bg': 'rgba(237,230,216,0.97)',
        'sb-text': '#2B2620',
        'sb-border': '#DDD1BC',
      },
      '#B5654A'
    ),
  },
  {
    id: 'teal-transformador',
    nombre: 'Teal transformador',
    descripcion: 'Verde azulado (teal) con acento salmón -- el más distinto al actual.',
    valores: construirValores(
      {
        'brand-1': '#0F5C56',
        'brand-2': '#0C4A45',
        'brand-3': '#093934',
        'app-accent-ink': '#FFFFFF',
        'app-bg': '#FAFAF7',
        'app-text': '#152422',
        'app-text-muted': '#87938F',
        'app-border': '#E2E2DA',
        'card-header-bg': '#0F5C56',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#FFFFFF',
        'card-footer-bg': '#FFFFFF',
        'card-border': '#E2E2DA',
        'table-header-bg': '#EFEFEA',
        'table-header-text': '#87938F',
        'table-row-hover': '#EFEFEA',
        'table-border': '#E2E2DA',
        'form-section-bg': '#EFEFEA',
        'input-bg': '#FFFFFF',
        'sb-header-bg': 'rgba(250,250,247,0.97)',
        'sb-body-bg': 'rgba(250,250,247,0.97)',
        'sb-footer-bg': 'rgba(250,250,247,0.97)',
        'sb-text': '#152422',
        'sb-border': '#E2E2DA',
      },
      '#0F5C56'
    ),
  },
];
