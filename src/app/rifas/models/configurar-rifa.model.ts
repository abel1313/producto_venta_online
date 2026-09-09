export type TipoRifa = 'MENSUAL' | 'DIARIA' | 'PLATAFORMAS';

export interface IConfigurarRifa {
  id?: number;
  fechaHoraLimite: string;
  activa: boolean;
  totalVariantes?: number;
  variantesSorteadas?: number;
  tipo?: TipoRifa;
  mesReferencia?: string | null;
  esPrueba?: boolean;
  // Ventana en la que se aceptan boletos por acciones en redes sociales (yyyy-MM-dd).
  // Si no está configurada, se usa el mes de la rifa (mesReferencia) como rango.
  fechaInicioBoletos?: string | null;
  fechaFinBoletos?: string | null;
  // Es la rifa que sirve el link público (/ruleta/{id}). Publicada hay una sola:
  // publicar otra despublica esta.
  publica?: boolean;
}

// Request para crear/actualizar la sesión de la rifa
export interface IConfigurarRifaRequest {
  fechaHoraLimite: string;
  activa: boolean;
  tipo?: TipoRifa;
  mesReferencia?: string | null;
  esPrueba?: boolean;
}

// Variante tal como llega en los endpoints 3, 4 y 12
export interface IVarianteRifaResumen {
  id: number;
  talla?: string;
  color?: string;
  stock: number;
  marca?: string;
  codigoBarras?: string;
  nombreProducto?: string;
  precio?: number;
  // El back manda las dos: imagenUrl la resuelve el navegador contra el micro de imágenes
  // (es la que se usa) y imagenBase64 queda como respaldo si esa URL no viniera.
  imagenUrl?: string;
  imagenBase64?: string;
}

export interface IConfigurarRifaVariante {
  id?: number;
  configurarRifaId?: number;
  variante?: IVarianteRifaResumen;
  palabraClave: string;
  giroGanador: number;
  orden: number;
  permitirNuevos: boolean;
  stockReservado?: number;
}

// Request para guardar
export interface IConfigurarRifaVarianteRequest {
  configurarRifaId: number;
  varianteId: number;
  palabraClave: string;
  giroGanador: number;
  orden: number;
  permitirNuevos: boolean;
}
