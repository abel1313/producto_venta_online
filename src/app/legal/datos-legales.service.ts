import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * Datos del negocio que la ley pide mostrar antes de comprar (LFPC art. 76 bis III):
 * dominio `datoslegales` del back. Los captura el dueño en Configuración del negocio →
 * Datos legales; los leen el pie de página, Términos, Aviso de privacidad y el ticket.
 */
export interface IDatosLegales {
  nombreResponsable: string | null;
  rfc:               string | null;
  domicilio:         string | null;
  telefono:          string | null;
  correo:            string | null;
  horarioAtencion:   string | null;
  /** Lo que falta para cumplir el 76 bis III ("Domicilio", "Teléfono"…). */
  faltan:            string[];
  completos:         boolean;
}

export type IDatosLegalesRequest = Omit<IDatosLegales, 'faltan' | 'completos'>;

/** Correo que se mostraba antes de que existieran los datos legales; respaldo si el back no contesta. */
export const CORREO_CONTACTO_RESPALDO = 'contacto@novedades-jade.com.mx';

const VACIOS: IDatosLegales = {
  nombreResponsable: null, rfc: null, domicilio: null, telefono: null,
  correo: CORREO_CONTACTO_RESPALDO, horarioAtencion: null, faltan: [], completos: false
};

@Injectable({ providedIn: 'root' })
export class DatosLegalesService {
  private readonly url = `${environment.api_Url}/v1/datos-legales`;
  private cache$?: Observable<IDatosLegales>;

  constructor(private readonly http: HttpClient) {}

  /** Una sola petición por carga de la app; si falla, se queda el correo de siempre. */
  obtener(): Observable<IDatosLegales> {
    if (!this.cache$) {
      this.cache$ = this.http.get<{ data: IDatosLegales }>(this.url).pipe(
        map(r => ({ ...VACIOS, ...(r?.data ?? {}), correo: r?.data?.correo || CORREO_CONTACTO_RESPALDO })),
        catchError(() => of(VACIOS)),
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  guardar(datos: IDatosLegalesRequest): Observable<IDatosLegales> {
    return this.http.put<{ data: IDatosLegales }>(this.url, datos).pipe(
      map(r => r.data),
      tap(() => this.cache$ = undefined)
    );
  }
}

/** "5512345678" → "55 1234 5678". */
export function telefonoLegible(tel: string | null | undefined): string {
  const d = (tel ?? '').replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : (tel ?? '');
}
