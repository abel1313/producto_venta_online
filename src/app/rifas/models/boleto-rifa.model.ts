export interface IBoletoRifa {
  id?: number;
  concursante?: { id: number; nombre?: string; apellidoPaterno?: string };
  motivo?: string | null;
  fecha: string; // yyyy-MM-dd
  urlPerfilRedSocial?: string | null;
  urlSeguimiento?: string | null;
  urlsCompartido?: string[];
}

// Request para registrar un boleto -- el concursante ya existe, solo se referencia por id
export interface IBoletoRifaRequest {
  concursanteId: number;
  motivo?: string | null;
  fecha?: string | null;
  urlPerfilRedSocial?: string | null;
  urlSeguimiento?: string | null;
  urlsCompartido?: string[];
}
