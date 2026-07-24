// Catálogo de lugares de entrega — usado para filtrar pedidos por zona en vez de buscar
// en el texto libre de direccionEntrega

export interface ILugarEntrega {
  id:     number;
  nombre: string;
}

export interface ILugarEntregaRequest {
  nombre: string;
}
