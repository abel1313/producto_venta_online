import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface IReconciliacionIniciada {
  code: number;
  data: string;
}

export interface IResultadoReconciliacion {
  code: number;
  data: {
    enProceso: boolean;
    ejecutadoEn: string;
    productosRevisados: number;
    variantesRevisadas: number;
    reparados: string[];
    faltantesEnDisco: string[];
    archivosEliminadosDisco: number;
    bytesLiberados: number;
    imagenesEliminadas?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly url = `${environment.api_Url}/admin`;

  constructor(private readonly http: HttpClient) {}

  limpiarCache(): Observable<string[]> {
    return this.http.delete<{ data: string[] }>(`${this.url}/cache`)
      .pipe(map(res => res.data));
  }

  iniciarReconciliacion(productoId?: number): Observable<IReconciliacionIniciada> {
    const params = productoId ? `?productoId=${productoId}` : '';
    return this.http.post<IReconciliacionIniciada>(
      `${this.url}/reconciliacion/imagenes${params}`, {}
    );
  }

  verResultadoReconciliacion(): Observable<IResultadoReconciliacion> {
    return this.http.get<IResultadoReconciliacion>(
      `${this.url}/reconciliacion/imagenes/resultado`
    );
  }

  limpiarBD(): Observable<IReconciliacionIniciada> {
    return this.http.post<IReconciliacionIniciada>(
      `${this.url}/reconciliacion/imagenes/limpiar-bd`, {}
    );
  }
}
