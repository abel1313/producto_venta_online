// Diseños predefinidos para la pantalla de Personalización -- 3 paletas completas (Marca,
// Página, Card, Tablas, Menú lateral, Formularios) que el dueño puede aplicar de un clic sin
// editar variable por variable. Colores de Marca/Página/Card/Tablas tomados 1:1 del mockup
// comparativo que se le mostró (3 direcciones de estilo sobre un card de pedido real: navbar,
// botones, header/body/footer). El mockup no mostraba el sidebar, así que sb-* se deriva con el
// mismo patrón que ya usa el sidebar por defecto: fondo casi blanco/translúcido en tono del color
// de página del preset, mismo texto/borde que el resto de la paleta.
//
// Solo tocan `valorClaro` -- el modo oscuro sigue con su propio esquema (ya corregido para que
// brand-1/2/3 se inviertan a blanco/gris en oscuro y las cards/chatbot usen colores fijos donde
// corresponde). Aplicar un preset NO cambia esa lógica ni el modo oscuro.
export interface PresetDiseno {
  id: string;
  nombre: string;
  descripcion: string;
  valores: Record<string, string>;
}

export const PRESETS_DISENO: PresetDiseno[] = [
  {
    id: 'jade-profundo',
    nombre: 'Jade profundo elevado',
    descripcion: 'Verde jade oscuro con acentos crema -- el más cercano al verde actual.',
    valores: {
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
  },
  {
    id: 'neutros-calidos',
    nombre: 'Neutros cálidos de boutique',
    descripcion: 'Terracota y beige -- look de tienda de ropa/boutique, más cálido.',
    valores: {
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
  },
  {
    id: 'teal-transformador',
    nombre: 'Teal transformador',
    descripcion: 'Verde azulado (teal) con acento salmón -- el más distinto al actual.',
    valores: {
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
  },
];
