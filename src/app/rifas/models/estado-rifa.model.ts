import { IConcursante } from './concursante.model';
import { IConfigurarRifa, IConfigurarRifaVariante, IVarianteRifaResumen } from './configurar-rifa.model';
import { IGanadorRifa } from './ganador-rifa.model';

export interface IHistorialVariante {
  orden: number;
  configurarRifaVariante: {
    palabraClave: string;
    variante: IVarianteRifaResumen;
  };
  concursanteGanador: IConcursante;
  modoContinuacion?: string;
}

export interface IEstadoRifa {
  configurarRifa: IConfigurarRifa;
  totalConcursantes: number;
  totalVariantes: number;
  varianteNumeroActual: number;
  varianteActual: IConfigurarRifaVariante | null;
  giroActual: number;
  giroGanador: number;
  elegibles: IConcursante[];
  descartados: IConcursante[];
  ganador: IGanadorRifa | null;
  rifaTerminada: boolean;
  historial: IHistorialVariante[];
}
