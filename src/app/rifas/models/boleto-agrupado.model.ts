import { PlataformaBoleto } from './boleto-rifa.model';

/**
 * Boletos agrupados por perfil (back 2026-09-22).
 *
 * **El problema que resuelve:** antes, para registrar que un cliente participó había que
 * cargar nombre → plataforma → URL del perfil, y eso daba UN boleto. Si el mismo cliente hizo
 * tres cosas en la misma red, había que repetir todo el alta tres veces, y quedaban como
 * renglones sueltos sin que se viera que son la misma persona.
 *
 * Ahora la cabecera se carga una vez y se le suman participaciones: **cada URL es un boleto**.
 *
 * ⚠️ **El sorteo NO cambió.** Por debajo sigue habiendo una fila por participación, porque el
 * sorteo elige filas al azar — agruparlas en una sola le quitaría chances a la persona. El
 * agrupamiento es de presentación.
 */

/**
 * Cómo se valida la URL de una participación.
 *
 * Se elige **por participación**, no una vez para toda la rifa: el caso real es "normalmente
 * quiero que la URL sea única, pero esta en particular se repite de verdad y necesito poder
 * cargarla igual".
 *
 * Se manda una o la otra, **nunca las dos**: una participación es un boleto, y mandar las dos
 * no lo convierte en dos.
 */
export type ModoDeCarga = 'UNICA' | 'REPETIDA_PERMITIDA';

export interface IParticipacion {
  /** Lo que hay que mandar para quitar esta participación. */
  boletoId:          number;
  urlParticipacion:  string;
  motivo?:           string | null;
  fecha?:            string | null;
}

export interface IGrupoBoletosPerfil {
  concursanteId:      number;
  nombreConcursante:  string;
  plataforma:         PlataformaBoleto;
  urlPerfil:          string;
  /** La cantidad de participaciones. Es lo que se muestra en la cabecera colapsada. */
  totalBoletos:       number;
  /** Fecha de la participación más nueva. La lista viene ordenada por esto, más reciente arriba. */
  ultimaParticipacion?: string | null;
  participaciones:    IParticipacion[];
  /** Solo del front: si el renglón está desplegado. Arranca colapsado. */
  expandido?:         boolean;
}

/** Una URL de participación al darla de alta. */
export interface INuevaParticipacion {
  urlParticipacion: string;
  motivo?:          string | null;
  modo?:            ModoDeCarga;
}

/** `POST /v1/rifas/{rifaId}/boletos-agrupados` */
export interface ICargarBoletosRequest {
  concursanteId:   number;
  plataforma:      PlataformaBoleto;
  urlPerfil:       string;
  participaciones: INuevaParticipacion[];
}
