import { aRgb } from '../../services/tema/tema.model';

// Diseños predefinidos de Personalización. Cada diseño trae TODAS las claves del catálogo
// (colores, letra, tamaños, botones), con su par de día ☀️ y de noche 🌙: al escoger uno no queda
// nada a medias del diseño anterior.
//
// - "Jade" (2026-10-01) es el predeterminado: verde jade y dorado, letra Inter, títulos peso 500,
//   botones delineados. Su `estilo` = "jade" enciende la capa de tema-jade.scss.
// - "Clásico" es el de fábrica de antes de Jade (styles.scss hasta 2026-09-30).
// - Los otros 3 son paletas de solo colores: conservan la letra, los tamaños y los botones
//   rellenos de antes (`estilo` = "clasico") y las claves nuevas se calculan de su paleta.
export interface ValorPreset {
  claro: string;
  oscuro: string;
}

export interface PresetDiseno {
  id: string;
  nombre: string;
  descripcion: string;
  predeterminado?: boolean;
  valores: Record<string, ValorPreset>;
}

type Lado = Record<string, string>;

function construirValores(claro: Lado, oscuro: Lado): Record<string, ValorPreset> {
  const valores: Record<string, ValorPreset> = {};
  for (const clave of Object.keys(claro)) {
    valores[clave] = { claro: claro[clave], oscuro: oscuro[clave] ?? claro[clave] };
  }
  return valores;
}

// Lo que no es color: igual de día y de noche.
const ESTRUCTURA_CLASICO: Lado = {
  'estilo': 'clasico',
  'font-family': "'Poppins', sans-serif",
  'title-weight': '700',
  'h1-size': '32', 'h2-size': '24', 'h3-size': '20',
  'body-size': '14', 'small-size': '12', 'label-size': '13',
  'input-size': '14', 'input-height': '38',
  'card-radius': '14', 'form-card-radius': '28', 'card-shadow': 'media',
  'app-bg-fx': 'none',
  'btn-primary-bg': 'linear-gradient(135deg, var(--brand-2), var(--brand-1))',
  'btn-primary-text': 'var(--app-accent-ink)',
  'btn-primary-border': 'transparent',
  'btn-primary-hover-bg': 'linear-gradient(135deg, var(--brand-2), var(--brand-1))',
  'btn-primary-hover-text': 'var(--app-accent-ink)',
};

const ESTRUCTURA_JADE: Lado = {
  'estilo': 'jade',
  'font-family': '"Inter", system-ui, sans-serif',
  'title-weight': '500',
  'h1-size': '40', 'h2-size': '28', 'h3-size': '20',
  'body-size': '14', 'small-size': '12', 'label-size': '12',
  'input-size': '15', 'input-height': '44',
  'card-radius': '8', 'form-card-radius': '14', 'card-shadow': 'linea',
  'btn-primary-bg': 'transparent',
  'btn-primary-text': 'var(--app-accent-text)',
  'btn-primary-border': 'var(--app-accent)',
  'btn-primary-hover-bg': 'var(--app-tint)',
  'btn-primary-hover-text': 'var(--app-accent-hover)',
};

const JADE_CLARO: Lado = {
  ...ESTRUCTURA_JADE,
  'brand-1': '#2d7560', 'brand-2': '#2f7f67', 'brand-3': '#1f5244',
  'app-accent-ink': '#f6f3ec', 'app-accent-text': '#2d7560', 'app-accent-hover': '#2f7f67',
  'app-tint': 'rgba(45,117,96,0.10)',
  'app-gold': '#94712a', 'app-gold-line': 'rgba(148,113,42,0.50)',
  'badge-bg': '#d5ece2', 'badge-text': '#16362e',
  'app-bg': '#f6f3ec',
  'app-bg-fx': 'radial-gradient(120% 60% at 0% 0%, #e3ede7 0%, #f6f3ec 55%)',
  'app-text': '#1c2a26', 'app-text-soft': '#4d5160', 'app-text-muted': '#5f6373', 'app-text-faint': '#6f7384',
  'app-border': 'rgba(28,42,38,0.16)', 'app-hairline': 'rgba(28,42,38,0.10)',
  'app-glass': 'rgba(246,243,236,0.72)', 'app-glass-strong': 'rgba(246,243,236,0.90)',
  'card-header-bg': '#ebe6da', 'card-header-text': '#1c2a26',
  'card-body-bg': '#ebe6da', 'card-footer-bg': '#ebe6da', 'card-border': 'rgba(28,42,38,0.16)',
  'shadow-md': '0 0 0 1px #d6cfc0, 0 6px 18px rgba(60,50,30,0.12)',
  'shadow-lg': '0 0 0 1px #d6cfc0, 0 16px 40px rgba(60,50,30,0.20)',
  'table-header-bg': 'transparent', 'table-header-text': '#6f7384',
  'table-row-hover': 'rgba(45,117,96,0.10)', 'table-border': 'rgba(28,42,38,0.10)',
  'sb-header-bg': '#ebe6da', 'sb-body-bg': '#ebe6da', 'sb-footer-bg': '#ebe6da',
  'sb-text': '#1c2a26', 'sb-border': 'rgba(28,42,38,0.10)',
  'form-section-bg': '#f6f3ec', 'input-bg': '#ebe6da', 'input-placeholder': '#6f7384',
};

const JADE_OSCURO: Lado = {
  ...ESTRUCTURA_JADE,
  'brand-1': '#5bb99a', 'brand-2': '#7fd2b2', 'brand-3': '#1f5244',
  'app-accent-ink': '#161826', 'app-accent-text': '#aee6cf', 'app-accent-hover': '#7fd2b2',
  'app-tint': 'rgba(91,185,154,0.14)',
  'app-gold': '#d4b36a', 'app-gold-line': 'rgba(212,179,106,0.55)',
  'badge-bg': '#1f5244', 'badge-text': '#eefaf5',
  'app-bg': '#161826',
  'app-bg-fx': 'radial-gradient(120% 60% at 0% 0%, #1b2a2a 0%, #161826 55%)',
  'app-text': '#e9e9ed', 'app-text-soft': '#cfd3e5', 'app-text-muted': '#b2b6ca', 'app-text-faint': '#9397ab',
  'app-border': 'rgba(233,233,237,0.16)', 'app-hairline': 'rgba(233,233,237,0.10)',
  'app-glass': 'rgba(22,24,38,0.60)', 'app-glass-strong': 'rgba(22,24,38,0.82)',
  'card-header-bg': '#232532', 'card-header-text': '#e9e9ed',
  'card-body-bg': '#232532', 'card-footer-bg': '#232532', 'card-border': 'rgba(233,233,237,0.16)',
  'shadow-md': '0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)',
  'shadow-lg': '0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,0.65)',
  'table-header-bg': 'transparent', 'table-header-text': '#9397ab',
  'table-row-hover': 'rgba(91,185,154,0.14)', 'table-border': 'rgba(233,233,237,0.10)',
  'sb-header-bg': '#232532', 'sb-body-bg': '#232532', 'sb-footer-bg': '#232532',
  'sb-text': '#e9e9ed', 'sb-border': 'rgba(233,233,237,0.10)',
  'form-section-bg': '#1c1e2c', 'input-bg': '#232532', 'input-placeholder': '#9397ab',
};

// El de fábrica antes de Jade (styles.scss hasta 2026-09-30): verde de marca de día, negro y
// blanco de noche.
const CLASICO_CLARO: Lado = {
  ...ESTRUCTURA_CLASICO,
  'brand-1': '#00875A', 'brand-2': '#005C3D', 'brand-3': '#00301F',
  'app-accent-ink': '#FFFFFF', 'app-accent-text': '#00875A', 'app-accent-hover': '#006B47',
  'app-tint': 'rgba(0,135,90,0.10)',
  'app-gold': '#00875A', 'app-gold-line': '#D5E8DD',
  'badge-bg': 'rgba(0,135,90,0.12)', 'badge-text': '#00875A',
  'app-bg': '#F3FAF6',
  'app-text': '#152420', 'app-text-soft': '#152420', 'app-text-muted': '#55736A', 'app-text-faint': '#55736A',
  'app-border': '#D5E8DD', 'app-hairline': '#D5E8DD',
  'app-glass': 'rgba(255,255,255,0.78)', 'app-glass-strong': 'rgba(255,255,255,0.82)',
  'card-header-bg': '#00875A', 'card-header-text': '#FFFFFF',
  'card-body-bg': '#FFFFFF', 'card-footer-bg': '#FFFFFF', 'card-border': '#D5E8DD',
  'shadow-md': '0 6px 20px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
  'shadow-lg': '0 20px 60px rgba(0,0,0,0.12)',
  'table-header-bg': '#F9FAFB', 'table-header-text': '#9CA3AF',
  'table-row-hover': '#F9FAFB', 'table-border': '#E5E7EB',
  'sb-header-bg': 'rgba(255,255,255,0.97)', 'sb-body-bg': 'rgba(255,255,255,0.97)', 'sb-footer-bg': 'rgba(255,255,255,0.97)',
  'sb-text': '#12241D', 'sb-border': '#D5E8DD',
  'form-section-bg': '#E3F2EA', 'input-bg': '#FFFFFF', 'input-placeholder': '#9DBAAD',
};

const CLASICO_OSCURO: Lado = {
  ...ESTRUCTURA_CLASICO,
  'brand-1': '#FFFFFF', 'brand-2': '#C7C7CC', 'brand-3': '#8E8E93',
  'app-accent-ink': '#000000', 'app-accent-text': '#FFFFFF', 'app-accent-hover': '#D4D4D8',
  'app-tint': 'rgba(255,255,255,0.10)',
  'app-gold': '#FFFFFF', 'app-gold-line': '#2A2A2E',
  'badge-bg': 'rgba(255,255,255,0.12)', 'badge-text': '#FFFFFF',
  'app-bg': '#000000',
  'app-text': '#E9E9EC', 'app-text-soft': '#E9E9EC', 'app-text-muted': '#9A9AA0', 'app-text-faint': '#9A9AA0',
  'app-border': '#2A2A2E', 'app-hairline': '#2A2A2E',
  'app-glass': 'rgba(12,12,12,0.72)', 'app-glass-strong': 'rgba(0,0,0,0.80)',
  'card-header-bg': '#00875A', 'card-header-text': '#FFFFFF',
  'card-body-bg': '#0C0C0C', 'card-footer-bg': '#0C0C0C', 'card-border': '#2A2A2E',
  'shadow-md': '0 8px 28px rgba(0,0,0,0.75)',
  'shadow-lg': '0 8px 40px rgba(0,0,0,0.55)',
  'table-header-bg': '#151517', 'table-header-text': '#9A9AA0',
  'table-row-hover': '#151517', 'table-border': '#2A2A2E',
  'sb-header-bg': 'rgba(0,0,0,0.92)', 'sb-body-bg': 'rgba(0,0,0,0.92)', 'sb-footer-bg': 'rgba(0,0,0,0.92)',
  'sb-text': '#E9E9EC', 'sb-border': 'rgba(255,255,255,0.08)',
  'form-section-bg': '#151517', 'input-bg': 'rgba(255,255,255,0.05)', 'input-placeholder': '#6E6E73',
};

/** Paleta de solo colores (como eran los diseños antes de Jade) → diseño completo: la letra,
 * tamaños y botones son los del Clásico, y las claves nuevas salen de la misma paleta, así que
 * se ve igual que antes de Jade. */
function completarPaleta(paleta: Lado, base: Lado, alfa: number): Lado {
  const marca = paleta['brand-1'];
  const rgb = aRgb(marca) ?? '0, 0, 0';
  return {
    ...base,
    'app-text-soft': paleta['app-text'],
    'app-text-faint': paleta['app-text-muted'],
    'app-hairline': paleta['app-border'],
    'app-accent-text': marca,
    'app-accent-hover': paleta['brand-2'],
    'app-tint': `rgba(${rgb.replace(/ /g, '')},${alfa})`,
    'app-gold': marca,
    'app-gold-line': paleta['app-border'],
    'badge-bg': `rgba(${rgb.replace(/ /g, '')},${alfa + 0.02})`,
    'badge-text': marca,
    'app-glass': paleta['sb-body-bg'],
    'app-glass-strong': paleta['sb-body-bg'],
    ...paleta,
  };
}

function presetDePaleta(id: string, nombre: string, descripcion: string, claro: Lado, oscuro: Lado): PresetDiseno {
  return {
    id, nombre, descripcion,
    valores: construirValores(
      completarPaleta(claro, CLASICO_CLARO, 0.10),
      completarPaleta(oscuro, CLASICO_OSCURO, 0.14)
    ),
  };
}

export const PRESETS_DISENO: PresetDiseno[] = [
  {
    id: 'jade',
    nombre: 'Jade',
    descripcion: 'El diseño nuevo: verde jade y dorado, letra Inter, títulos sin negrita y botones delineados.',
    predeterminado: true,
    valores: construirValores(JADE_CLARO, JADE_OSCURO),
  },
  {
    id: 'clasico',
    nombre: 'Clásico',
    descripcion: 'El de fábrica antes de Jade: verde de marca de día, negro y blanco de noche, letra Poppins.',
    valores: construirValores(CLASICO_CLARO, CLASICO_OSCURO),
  },
  presetDePaleta(
    'jade-profundo',
    'Jade profundo elevado',
    'Verde jade oscuro con acentos crema -- el más cercano al verde actual.',
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
  presetDePaleta(
    'neutros-calidos',
    'Neutros cálidos de boutique',
    'Terracota y beige -- look de tienda de ropa/boutique, más cálido.',
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
  presetDePaleta(
    'teal-transformador',
    'Teal transformador',
    'Verde azulado (teal) con acento salmón -- el más distinto al actual.',
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
];
