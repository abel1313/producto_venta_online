// Catálogo de lugares de entrega — usado para filtrar pedidos por zona en vez de buscar
// en el texto libre de direccionEntrega

export interface ILugarEntrega {
  id:     number;
  nombre: string;
}

export interface ILugarEntregaRequest {
  nombre: string;
}

// Respuesta paginada de GET /lugares-entrega/getAll
export interface ILugaresEntregaPaginable {
  pagina:          number;
  totalPaginas:    number;
  totalRegistros:  number;
  t:               ILugarEntrega[];
}
