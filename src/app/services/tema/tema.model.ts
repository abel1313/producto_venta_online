// Catálogo dinámico de variables de personalización visual -- ver GET /v1/tema-variable/activo
// y el resto del CRUD en el backend (TemaVariable). A diferencia del diseño anterior (columnas
// fijas), aquí cada fila ES una variable: agregar una nueva no requiere tocar código en ningún
// lado, ni back ni front -- basta con que su `clave` coincida con un var(--esa-clave) que ya
// exista en algún .scss para que tenga efecto visual (ver TemaService.aplicar()).
export interface ITemaVariable {
  id?: number;
  clave: string;               // nombre del custom property CSS SIN "--" (ej. "app-bg")
  etiqueta: string;            // texto legible para la pantalla de Personalización
  grupo?: string | null;       // agrupa la pantalla en secciones (ej. "Marca", "Card")
  tipo: 'color' | 'numero' | 'seleccion';
  valorClaro: string;
  valorOscuro?: string | null; // NULL = se usa valorClaro también de noche (variables estructurales)
  orden?: number | null;
}

// El dueño elige "suave/media/fuerte" de un select para card-shadow -- no escribe box-shadow a
// mano. Mismos valores que ya estaban a mano en styles.scss.
export const SOMBRAS_CARD: Record<string, string> = {
  suave:  '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
  media:  '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
  fuerte: '0 2px 6px rgba(0,0,0,0.12), 0 10px 32px rgba(0,0,0,0.10)',
};

// Claves que además de su propio --custom-property alimentan uno o más alias que otras hojas de
// estilo consumen con otro nombre pero EL MISMO valor por defecto (confirmado contra
// styles.scss: mismo hex en claro y en oscuro) -- así el dueño edita una sola fila en
// Personalización y cambia todos los lugares que visualmente son "lo mismo", sin tener que dar
// de alta una variable duplicada por cada nombre legado (ver Phase 4 del sweep de colores
// hardcodeados, 2026-08-27).
export const ALIAS_LEGACY: Record<string, string[]> = {
  'app-bg': ['--page-bg'],
  'app-text': ['--header-text', '--input-text'],
  'app-text-muted': ['--header-text-muted'],
  'app-border': ['--input-border'],
  'card-body-bg': ['--card-bg', '--app-surface'],
  'sb-body-bg': ['--sb-bg'],
  'form-section-bg': ['--app-surface-2'],
};
