export type PlataformaBoleto = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'OTRO';

export interface IBoletoRifa {
  id?: number;
  concursante?: { id: number; nombre?: string; apellidoPaterno?: string };
  plataforma?: PlataformaBoleto | null;
  motivo?: string | null;
  fecha: string; // yyyy-MM-dd
  urlPerfilRedSocial?: string | null;
  urlSeguimiento?: string | null;
  urlsCompartido?: string[];
}

// Request para registrar un boleto -- el concursante ya existe, solo se referencia por id
export interface IBoletoRifaRequest {
  concursanteId: number;
  plataforma?: PlataformaBoleto | null;
  motivo?: string | null;
  fecha?: string | null;
  urlPerfilRedSocial?: string | null;
  urlSeguimiento?: string | null;
  urlsCompartido?: string[];
}

// Boleto tal como lo devuelve el sorteo: ya trae el nombre resuelto
export interface IBoletoRifaDto {
  id: number;
  concursanteId: number;
  nombreCompleto: string;
  plataforma?: PlataformaBoleto | null;
  motivo?: string | null;
  fecha: string;
  urlPerfilRedSocial?: string | null;
  urlSeguimiento?: string | null;
  urlsCompartido?: string[];
  descartado: boolean;
}

// Boletos de una persona agrupados, para las tablas de "en juego" / "descartados"
export interface IGrupoBoletos {
  concursanteId: number;
  nombreCompleto: string;
  boletos: IBoletoRifaDto[];
  expandido: boolean;
}

export interface IEstadoRifaPlataformas {
  configurarRifa: any;
  variantes: any[];
  varianteActual: any | null;
  varianteNumeroActual: number;
  totalVariantes: number;
  giroActual: number;
  giroGanador: number;
  boletosEnJuego: IBoletoRifaDto[];
  boletosDescartados: IBoletoRifaDto[];
  ganadores: any[];
  rifaTerminada: boolean;
}

export interface IResultadoSorteoPlataformas {
  boleto: IBoletoRifaDto;
  esGanador: boolean;
  varianteActual: any;
  giroActual: number;
  giroGanador: number;
  rifaTerminada: boolean;
}
