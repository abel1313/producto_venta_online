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
