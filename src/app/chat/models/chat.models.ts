export type EstadoConexion = 'conectado' | 'reconectando' | 'sin-internet' | 'restaurado';

export interface ChatConectarRequest {
  tempId: string;
  nombreUsuario: string;
}

export interface ChatMensajeRequest {
  sesionId: string;
  contenido: string;
}

export interface ChatAdminResponderRequest {
  sesionId: string;
  contenido: string;
}

export interface ChatConexionResponse {
  sesionId: string;
}

export interface EventoUsuario {
  tipo: 'MENSAJE' | 'SESION_CERRADA';
  remitente?: 'ADMIN' | null;
  contenido?: string | null;
  timestamp?: string | null;
}

export interface EventoAdmin {
  tipo: 'NUEVA_SESION' | 'MENSAJE';
  sesionId: string;
  nombreUsuario: string;
  contenido?: string;
  timestamp?: string;
}

export interface SesionActiva {
  sesionId: string;
  nombreUsuario: string;
  estado: 'ACTIVA' | 'CERRADA';
  fechaInicio: string;
  ultimaActividad: string;
  ultimoMensaje: string | null;
}

export interface MensajeHistorial {
  remitente: 'USUARIO' | 'ADMIN';
  contenido: string;
  timestamp: string;
}

export interface HistorialPaginado {
  mensajes: MensajeHistorial[];
  pagina: number;
  totalPaginas: number;
  totalMensajes: number;
  hayMasAntiguos: boolean;
}

export interface ApiResponse<T> {
  code: number;
  mensaje: string;
  data: T;
}

export interface MensajeUI {
  remitente: 'USUARIO' | 'ADMIN';
  contenido: string;
  timestamp: string;
}
