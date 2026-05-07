import { IConcursante } from './concursante.model';
import { IConfigurarRifaVariante } from './configurar-rifa.model';

export interface IGanadorRifa {
  id?: number;
  descartado: boolean;
  concursante: IConcursante;
  configurarRifaVariante: IConfigurarRifaVariante;
  rifaTerminada?: boolean;
}
