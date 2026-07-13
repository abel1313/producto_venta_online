export interface IResena {
  id: number;
  varianteId: number;
  calificacion: number;
  comentario: string | null;
  fechaCreacion: string;
  nombreCliente: string;
  esPropia: boolean;
}

export interface IResenaPaginable {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
  t: IResena[];
}

export interface IResenaResumen {
  varianteId: number;
  promedio: number;
  totalResenas: number;
  conteoPorEstrella: Record<string, number>;
}
