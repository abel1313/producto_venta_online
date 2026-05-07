export interface IConfigurarRifa {
  id?: number;
  producto?: { id: number; nombre?: string; stock?: number };
  fechaHoraLimite: string;
  activa: boolean;
}

export interface IConfigurarRifaProducto {
  id?: number;
  configurarRifa?: { id: number };
  producto: { id: number; nombre?: string; stock?: number };
  orden: number;
  giroGanador: number;
  permitirNuevos: boolean;
}
