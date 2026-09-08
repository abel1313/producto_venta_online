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

// Marca de tiempo LOCAL en el mismo formato "naive" (sin 'Z'/offset) que manda el back para los
// mensajes reales -- encontrado 2026-09-08: el eco optimista de un mensaje propio (antes de que
// llegue la confirmación del servidor) usaba `new Date().toISOString().slice(0, 19)`, que es hora
// UTC con el 'Z' cortado. formatHora() en los componentes hace `new Date(timestamp)` sobre ese
// string sin 'Z' -- el spec de JS interpreta un string así como hora LOCAL, así que una hora UTC
// disfrazada de "sin zona" se reinterpretaba como si ya fuera local, corriendo el reloj mostrado
// por el offset completo (ej. -6h en CDMX). Este helper arma el string desde los componentes
// LOCALES de Date, no desde toISOString(), para que la reinterpretación como "local" sea correcta.
export function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
