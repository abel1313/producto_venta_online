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

/** Avance del generador de datos de prueba (back: dominio datosprueba). */
export interface IAvanceDatosPrueba {
  estado: 'SIN_CORRER' | 'EN_CURSO' | 'TERMINADO' | 'FALLO';
  fase: string;
  modelosPedidos: number;
  modelosCreados: number;
  articulosCreados: number;
  pedidosPedidos: number;
  pedidosCreados: number;
  pedidosConError: number;
  ultimoError: string | null;
  aviso: string | null;
  inicio: string | null;
  fin: string | null;
}

export interface IGenerarDatosPrueba {
  modelos: number;
  articulosMin: number;
  articulosMax: number;
  pedidos: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly url = `${environment.api_Url}/v1/admin`;

  constructor(private readonly http: HttpClient) {}

  // ── Datos de prueba (solo QA, solo administrador) ──────────────────────
  // El back se niega fuera de inventario_key_qa (403) y si ya hay una corrida (409).

  generarDatosPrueba(plan: IGenerarDatosPrueba): Observable<IAvanceDatosPrueba> {
    return this.http.post<{ data: IAvanceDatosPrueba }>(`${this.url}/datos-prueba/generar`, plan)
      .pipe(map(res => res.data));
  }

  avanceDatosPrueba(): Observable<IAvanceDatosPrueba> {
    return this.http.get<{ data: IAvanceDatosPrueba }>(`${this.url}/datos-prueba/avance`)
      .pipe(map(res => res.data));
  }

  darDeBajaDatosPrueba(): Observable<{ data: number; mensaje: string }> {
    return this.http.post<{ data: number; mensaje: string }>(`${this.url}/datos-prueba/dar-de-baja`, {});
  }

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

  limpiarDisco(): Observable<IReconciliacionIniciada> {
    return this.http.post<IReconciliacionIniciada>(
      `${this.url}/reconciliacion/imagenes/limpiar-disco`, {}
    );
  }
}
