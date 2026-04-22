import { IConcursante } from './concursante.model';
import { IConfigurarRifa } from './configurar-rifa.model';
import { IGanadorRifa } from './ganador-rifa.model';

export interface IEstadoRifa {
  configurarRifa: IConfigurarRifa;
  totalConcursantes: number;
  vueltaActual: number;
  elegibles: IConcursante[];
  descartados: IConcursante[];
  ganador: IGanadorRifa | null;
}
