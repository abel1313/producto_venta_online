export type CategoriaGasto = 'INVENTARIO' | 'OPERATIVO' | 'SERVICIOS' | 'OTROS';

export const CATEGORIAS: CategoriaGasto[] = ['INVENTARIO', 'OPERATIVO', 'SERVICIOS', 'OTROS'];

export const CATEGORIA_LABELS: Record<CategoriaGasto, string> = {
  INVENTARIO: 'Inventario (surtido)',
  OPERATIVO:  'Operativo (renta, luz…)',
  SERVICIOS:  'Servicios (empaque, transp…)',
  OTROS:      'Otros'
};

export interface IGasto {
  id?: number;
  descripcion: string;
  monto: number;
  fecha: string;           // yyyy-MM-dd
  categoria: CategoriaGasto;
  proveedor?: string | null;
  comprobante?: string | null;
  notas?: string | null;
}

export interface IVenta {
  id: number;
  totalVenta: number;
  gananciaTotal: number;
  estadoVenta: string;
  fechaVenta: string;
  cliente?: { nombrePersona?: string | null; apellidoPaterno?: string | null } | null;
}

export interface IGastoReporte {
  fechaInicio: string;
  fechaFin: string;
  totalVentas: number;
  totalGananciaProductos: number;
  totalTransacciones: number;
  totalGastos: number;
  gastosPorCategoria: Partial<Record<CategoriaGasto, number>>;
  gananciaNeta: number;
}

export interface IPaginadoGasto {
  t: IGasto[];
  totalRegistros: number;
  totalPaginas: number;
  pagina: number;
}

export interface IPaginadoVenta {
  t: IVenta[];
  totalRegistros: number;
  totalPaginas: number;
  pagina: number;
}

// Legacy — kept for backward compatibility
export interface IGastos {
  id?: number;
  descripcionGasto: string;
  precioGasto: number;
}
