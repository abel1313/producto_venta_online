export interface IPromocionDetalle {
  varianteId: number;
  nombreProducto?: string;
  talla?: string;
  color?: string;
  marca?: string;
  cantidad: number;
  precioNormal: number;
  precioEnPromocion: number;
  imagenUrl?: string;
  existencias?: number; // stock actual de la variante — solo viene en GET /admin
}

export interface IPromocion {
  id: number;
  descripcion: string;
  fechaVencimiento: string; // ISO "2026-07-05T18:00:00"
  activo: boolean;
  instanciasDisponibles?: number; // solo en GET activas
  detalles?: IPromocionDetalle[];
}

export interface IPromocionRequest {
  descripcion: string;
  fechaVencimiento: string;
  detalles: {
    varianteId: number;
    cantidad: number;
    precioEnPromocion: number;
  }[];
}

export interface IPromocionPaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IPromocion[];
}

export interface IItemPromoCarrito {
  promocionId: number;
  descripcion: string;
  cantidadCombos: number;
  instanciasDisponibles: number;
  precioTotal: number; // suma de precioEnPromocion * cantidad de cada detalle (para 1 combo)
  detalles: IPromocionDetalle[];
}
