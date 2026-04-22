import { IConcursante } from './concursante.model';

export interface IGanadorRifa {
  id?: number;
  concursante: IConcursante;
  producto: {
    id: number;
    nombre: string;
    [key: string]: any;
  };
  descartado: boolean;
}
