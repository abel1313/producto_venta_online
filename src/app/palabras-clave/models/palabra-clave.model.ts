// Catálogo de palabras clave — usado para categorizar productos y variantes
// y mejorar la búsqueda por prioridad en el backend

export interface IPalabraClave {
  id:     number;
  nombre: string;
}

export interface IPalabraClaveRequest {
  nombre: string;
}

// Respuesta paginada del endpoint GET /palabras-clave/buscar
export interface IPalabrasClavePaginable {
  pagina:          number;
  totalPaginas:    number;
  totalRegistros:  number;
  t:               IPalabraClave[];
}
