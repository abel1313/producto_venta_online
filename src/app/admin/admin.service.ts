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

/** Una prueba de QA que se puede preparar con un botón (back: R16 del dominio datosprueba). */
export interface IEscenarioPrueba {
  prueba: string;
  titulo: string;
}

/**
 * Algo que se dio de alta para una prueba y cómo buscarlo: un modelo o artículo (Art-A, M-OFF…), una rifa de
 * prueba, un código de "Agregar mi compra" o un usuario de prueba (desde el 2026-10-14). `codigoBarras` es lo
 * que se copia al tocarlo: el código de barras, el código de compra o el nombre de usuario.
 */
export interface ICatalogoPreparado {
  clave: string;
  tipo: 'MODELO' | 'ARTICULO' | 'RIFA' | 'CODIGO' | 'USUARIO';
  modeloId: number;
  articuloId: number;
  nombre: string;
  codigoBarras: string | null;
  queEs: string;
}

/** Lo que dejó lista "Preparar prueba N": pedidos, modelos y artículos nuevos y por dónde seguir. */
export interface IEscenarioPreparado {
  prueba: string;
  titulo: string;
  /** `cliente` es el nombre con el que se ve el pedido en pantalla ("Prueba 24 K4"): lo que se busca en Mis pedidos. */
  pedidos: { clave: string; pedidoId: number; queEs: string; cliente?: string | null }[];
  catalogo: ICatalogoPreparado[];
  siguientePaso: string | null;
  /** Solo en "Preparar todas": por qué no se pudo preparar esa prueba. */
  error: string | null;
  /** Lo que se quitó de la vez anterior antes de volver a crearla ("2 pedidos cancelados y 1 modelo dado de baja"). */
  queSeQuito?: string | null;
}

/** Lo que se quitó de una prueba: los pedidos se cancelan y los modelos se dan de baja, nada se borra. */
export interface IPruebaQuitada {
  prueba: string;
  titulo: string;
  pedidosCancelados: number;
  pedidosSinCancelar: number;
  modelosDadosDeBaja: number;
  /** Rifas y usuarios de prueba que se desactivaron (desde el 2026-10-14). */
  otrosDesactivados?: number;
  error: string | null;
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

  /** Las pruebas que se pueden preparar (20, 21, 22…). Vienen en `lista`, no en `data`. */
  escenariosPrueba(): Observable<IEscenarioPrueba[]> {
    return this.http.get<{ lista: IEscenarioPrueba[] }>(`${this.url}/datos-prueba/escenarios`)
      .pipe(map(res => res.lista ?? []));
  }

  /**
   * Deja lista esa prueba (modelos, artículos, pedidos). Si ya estaba preparada, primero quita lo de la vez
   * anterior: tocarlo otra vez es reiniciar la prueba.
   */
  prepararPrueba(prueba: string): Observable<IEscenarioPreparado> {
    return this.http.post<{ data: IEscenarioPreparado }>(`${this.url}/datos-prueba/preparar/${encodeURIComponent(prueba)}`, {})
      .pipe(map(res => res.data));
  }

  /** Todas las pruebas de una vez. La que falla viene con `error`; las demás quedan listas. */
  prepararTodas(): Observable<IEscenarioPreparado[]> {
    return this.http.post<{ lista: IEscenarioPreparado[] }>(`${this.url}/datos-prueba/preparar-todas`, {})
      .pipe(map(res => res.lista ?? []));
  }

  /** Quita lo de esa prueba sin volver a crearlo (pedidos cancelados, modelos dados de baja). */
  quitarPrueba(prueba: string): Observable<IPruebaQuitada> {
    return this.http.post<{ data: IPruebaQuitada }>(`${this.url}/datos-prueba/quitar/${encodeURIComponent(prueba)}`, {})
      .pipe(map(res => res.data));
  }

  /** Quita lo de todas las pruebas. La que falla viene con `error`; las demás se quitan. */
  quitarTodas(): Observable<IPruebaQuitada[]> {
    return this.http.post<{ lista: IPruebaQuitada[] }>(`${this.url}/datos-prueba/quitar-todas`, {})
      .pipe(map(res => res.lista ?? []));
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
