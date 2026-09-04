export interface IEntregaZonaPendiente {
  pedidoId: number;
  nombreCliente: string;
  correo: string | null;
  total: number;
  fechaPedido: string;
}

export interface IEntregaZonaSemana {
  lunes: string;
  viernes: string;
  fechaSugerida: string | null;
  pedidos: IEntregaZonaPendiente[];
}

export interface IProgramarEntregaZonaRequest {
  fecha: string;
  hora: string;
  puntoEncuentro: string;
}
