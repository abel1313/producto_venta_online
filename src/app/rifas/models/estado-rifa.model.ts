import { IConcursante } from './concursante.model';
import { IConfigurarRifa, IConfigurarRifaProducto } from './configurar-rifa.model';
import { IGanadorRifa } from './ganador-rifa.model';

export interface IHistorialProducto {
  producto: { id: number; nombre: string };
  ganador: IConcursante;
  descartados: IConcursante[];
}

export interface IEstadoRifa {
  configurarRifa: IConfigurarRifa;
  productoActual: IConfigurarRifaProducto | null;
  giroActual: number;
  giroGanador: number;
  totalProductos: number;
  productoNumeroActual: number;
  elegibles: IConcursante[];
  descartados: IConcursante[];
  ganador: IGanadorRifa | null;
  rifaTerminada: boolean;
  historial: IHistorialProducto[];
  // legacy
  totalConcursantes?: number;
  vueltaActual?: number;
}
