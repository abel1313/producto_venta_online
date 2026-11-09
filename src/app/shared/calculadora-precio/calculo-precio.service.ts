import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** Una comisión de terminal que ya está dada de alta para el cobro con tarjeta (forma de pago + plan). `totalPct` = tarifa + IVA, en % del precio. */
export interface IComisionTerminal { pagosYMesesId: number; descripcion: string; tarifaPct: number; ivaPct: number; totalPct: number; }

/** Lo que se guarda de un cálculo de precio (todo es por una pieza). La ganancia y el margen real los calcula el back. */
export interface ICalculoParaGuardar {
  costoCompra: number; transporte: number; otros: number;
  comisionPct: number; comisionDescripcion: string | null;
  margenPct: number; precioCalculado: number; precioCobrado: number;
  actualizoPrecioCompra: boolean;
}

/** Un cálculo ya guardado (el último del producto o uno del historial). */
export interface ICalculoGuardado extends ICalculoParaGuardar {
  id: number; productoId: number; costoTotal: number; gananciaReal: number; margenReal: number;
  nota: string | null; usuario: string | null; fecha: string;
}

/** Una fila del listado de cálculos: el último cálculo de un producto con su nombre y el precio de venta de hoy. */
export interface ICalculoDeProducto {
  calculo: ICalculoGuardado;
  nombreProducto: string;
  precioVentaActual: number | null;
  /** El precio de venta de hoy ya no es el que se cobró en ese cálculo (se cambió el precio después). */
  precioCambio: boolean;
}

export interface IPaginaCalculos { pagina: number; totalPaginas: number; totalRegistros: number; items: ICalculoDeProducto[]; }

export interface IFiltroCalculos { nombre: string; desde: string | null; hasta: string | null; }

/**
 * Cálculos de precio de un producto. Contrato: `CAMBIOS_FRONT.md` del back, sección «Calculadora de precio: se guarda lo que se calculó» (2026-11-09).
 * Todo es solo administrador. Si falla algo (por ejemplo, la migración todavía no corrió) la calculadora sigue funcionando: solo no se guarda el historial.
 */
@Injectable({ providedIn: 'root' })
export class CalculoPrecioService {

  private readonly url = `${environment.api_Url}/v1/calculos-precio`;

  constructor(private readonly http: HttpClient) {}

  /** Comisiones de terminal ya dadas de alta; si no se pueden leer, lista vacía (= solo «sin comisión»). */
  comisiones(): Observable<IComisionTerminal[]> {
    return this.http.get<{ lista: IComisionTerminal[] | null }>(`${this.url}/comisiones`).pipe(map(r => r?.lista ?? []), catchError(() => of([])));
  }

  /** Guarda un registro nuevo del historial del producto (ya guardado: necesita su id). */
  guardar(productoId: number, c: ICalculoParaGuardar): Observable<ICalculoGuardado> {
    return this.http.post<{ data: ICalculoGuardado }>(this.url, { productoId, ...c }).pipe(map(r => r.data));
  }

  /** El último cálculo del producto, o null si nunca tuvo uno (204) o no se pudo leer. */
  ultimo(productoId: number): Observable<ICalculoGuardado | null> {
    return this.http.get<{ data: ICalculoGuardado | null } | null>(`${this.url}/producto/${productoId}/ultimo`)
      .pipe(map(r => r?.data ?? null), catchError(() => of(null)));
  }

  /** El historial de cálculos del producto (del más nuevo al más viejo). Si no se puede leer, lista vacía. */
  historial(productoId: number, max = 10): Observable<ICalculoGuardado[]> {
    return this.http.get<{ lista: ICalculoGuardado[] | null }>(`${this.url}/producto/${productoId}?max=${max}`)
      .pipe(map(r => r?.lista ?? []), catchError(() => of([])));
  }

  /** Lo calculado en todos los productos: el último cálculo de cada uno, con filtros y páginas (página desde 1). */
  listar(f: IFiltroCalculos, pagina: number, tamano: number): Observable<IPaginaCalculos> {
    const q = new URLSearchParams({ page: String(pagina), size: String(tamano) });
    if (f.nombre.trim()) q.set('nombre', f.nombre.trim());
    if (f.desde) q.set('desde', f.desde);
    if (f.hasta) q.set('hasta', f.hasta);
    return this.http.get<{ data: IPaginaCalculos }>(`${this.url}?${q.toString()}`).pipe(map(r => r.data));
  }
}
