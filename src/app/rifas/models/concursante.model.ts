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
}

// Cliente que viene del endpoint /concursante/clientesPorMes
export interface IClientePedido {
  clientePedidoId: number | null;
  nombre: string;
  apellidoPaterno: string;
  telefono: string;
}

// Request para importar masivo
export interface IImportarDePedidosRequest {
  configurarRifaId: number;
  palabraClave: string;
  ordenDesde: number;
  clientes: IClientePedido[];
}
