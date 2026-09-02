// Diseños predefinidos para la pantalla de Personalización -- 3 paletas completas (Marca,
// Página, Card, Tablas, Menú lateral, Formularios), cada una con su par claro ☀️ / oscuro 🌙
// COMPLETO y propio (no un esquema oscuro compartido) -- ambos tomados 1:1 del canvas de
// comparación día/noche que se le mostró (mismo card de pedido real: navbar, botones,
// header/body/footer, en las 6 variantes).
//
// A diferencia de la primera versión de este archivo, aquí --brand-1/2/3 SÍ llevan un color de
// noche propio por diseño (no se invierten a blanco/gris) -- eso es lo que hace que botones y
// acentos de TODA la app (no solo el header de las cards) tomen el color del diseño elegido
// también en modo oscuro. app-accent-ink cambia junto con brand-1: como el acento ya no es
// blanco, el texto sobre el acento pasa a ser oscuro para mantener contraste.
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

function construirValores(
  claro: Record<string, string>,
  oscuro: Record<string, string>
): Record<string, ValorPreset> {
  const valores: Record<string, ValorPreset> = {};
  for (const clave of Object.keys(claro)) {
    valores[clave] = { claro: claro[clave], oscuro: oscuro[clave] ?? claro[clave] };
  }
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
      {
        'brand-1': '#22C55E',
        'brand-2': '#16A34A',
        'brand-3': '#14532D',
        'app-accent-ink': '#06210F',
        'app-bg': '#0A130F',
        'app-text': '#E8F5EE',
        'app-text-muted': '#7C9C8A',
        'app-border': '#1B2E24',
        'card-header-bg': '#0B4D3A',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#0F1A15',
        'card-footer-bg': '#0F1A15',
        'card-border': '#1B2E24',
        'table-header-bg': '#152018',
        'table-header-text': '#7C9C8A',
        'table-row-hover': '#152018',
        'table-border': '#1B2E24',
        'form-section-bg': '#152018',
        'input-bg': 'rgba(255,255,255,0.05)',
        'sb-header-bg': 'rgba(10,19,15,0.92)',
        'sb-body-bg': 'rgba(10,19,15,0.92)',
        'sb-footer-bg': 'rgba(10,19,15,0.92)',
        'sb-text': '#E8F5EE',
        'sb-border': 'rgba(255,255,255,0.08)',
      }
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
      {
        'brand-1': '#E08A5D',
        'brand-2': '#C46B42',
        'brand-3': '#9A5A3C',
        'app-accent-ink': '#2B1608',
        'app-bg': '#140F0B',
        'app-text': '#F2E9DE',
        'app-text-muted': '#A6907E',
        'app-border': '#2E241C',
        'card-header-bg': '#B5654A',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#1C1512',
        'card-footer-bg': '#1C1512',
        'card-border': '#2E241C',
        'table-header-bg': '#221A15',
        'table-header-text': '#A6907E',
        'table-row-hover': '#221A15',
        'table-border': '#2E241C',
        'form-section-bg': '#221A15',
        'input-bg': 'rgba(255,255,255,0.05)',
        'sb-header-bg': 'rgba(20,15,11,0.92)',
        'sb-body-bg': 'rgba(20,15,11,0.92)',
        'sb-footer-bg': 'rgba(20,15,11,0.92)',
        'sb-text': '#F2E9DE',
        'sb-border': 'rgba(255,255,255,0.08)',
      }
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
      {
        'brand-1': '#2DD4BF',
        'brand-2': '#0F766E',
        'brand-3': '#0C4A45',
        'app-accent-ink': '#062626',
        'app-bg': '#071414',
        'app-text': '#E7F5F3',
        'app-text-muted': '#7DA39F',
        'app-border': '#163333',
        'card-header-bg': '#0F5C56',
        'card-header-text': '#FFFFFF',
        'card-body-bg': '#0D1F1F',
        'card-footer-bg': '#0D1F1F',
        'card-border': '#163333',
        'table-header-bg': '#11201F',
        'table-header-text': '#7DA39F',
        'table-row-hover': '#11201F',
        'table-border': '#163333',
        'form-section-bg': '#11201F',
        'input-bg': 'rgba(255,255,255,0.05)',
        'sb-header-bg': 'rgba(7,20,20,0.92)',
        'sb-body-bg': 'rgba(7,20,20,0.92)',
        'sb-footer-bg': 'rgba(7,20,20,0.92)',
        'sb-text': '#E7F5F3',
        'sb-border': 'rgba(255,255,255,0.08)',
      }
    ),
  },
];
