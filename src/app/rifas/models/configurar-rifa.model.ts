export interface IConfigurarRifa {
  id?: number;
  fechaHoraLimite: string;
  activa: boolean;
  totalVariantes?: number;
  variantesSorteadas?: number;
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
  imagenBase64?: string;
}

export interface IConfigurarRifaVariante {
  id?: number;
  configurarRifaId?: number;
  variante: IVarianteRifaResumen;
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
