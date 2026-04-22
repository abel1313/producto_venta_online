export interface IConfigurarRifa {
  id?: number;
  producto?: { id: number; nombre?: string; stock?: number };
  fechaHoraLimite: string;
  activa: boolean;
}
