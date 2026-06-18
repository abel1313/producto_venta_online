export interface IConcursante {
  id?: number;
  nombre: string;
  apellidoPaterno: string;
  telefono: string;
  palabraClave?: string;
  ordenDesde?: number;
  configurarRifa?: { id: number };
  clientePedidoId?: number | null;
  descartado?: boolean;
  boletosBase?: number;
  boletos?: number;
  agregadoEnPrueba?: boolean;
}

// Response de /v1/concursante/importarDePedidos
export interface IOmitidoYaRegistrado {
  clientePedidoId: number | null;
  nombre: string;
}

export interface IImportarDePedidosResponse {
  importados: IConcursante[];
  omitidosYaRegistrados: IOmitidoYaRegistrado[];
  omitidosSinNombre: IClientePedido[];
}

// Cliente que viene del endpoint /concursante/clientesPorMes
export interface IClientePedido {
  clientePedidoId: number | null;
  nombre: string;
  apellidoPaterno: string;
  telefono: string;
  sinRegistro: boolean;
}

// Request para importar masivo
export interface IImportarDePedidosRequest {
  configurarRifaId: number;
  palabraClave: string;
  ordenDesde: number;
  mes: string;
  clientes: IClientePedido[];
}
