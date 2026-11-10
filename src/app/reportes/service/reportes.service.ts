import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ReporteDiario {
  fecha:          string;
  totalVenta:     number;
  totalGanancia:  number;
  cantidadVentas: number;
}

export interface ReportePorDia {
  fecha:          string;
  totalVenta:     number;
  totalGanancia:  number;
  cantidadVentas: number;
}

export interface ReporteMensual {
  mes:            string;
  totalVenta:     number;
  totalGanancia:  number;
  cantidadVentas: number;
  porDia:         ReportePorDia[];
}

export interface VentaResumen {
  ventaId:       number;
  fechaVenta:    string;
  totalVenta:    number;
  gananciaTotal: number;
}

export interface ReporteCliente {
  clienteId:     number;
  clienteNombre: string;
  totalCompras:  number;
  totalGastado:  number;
  ventas:        VentaResumen[];
}

export interface ProductoMasVendido {
  varianteId:       number;
  productoNombre:   string;
  talla:            string | null;
  color:            string | null;
  cantidadVendida:  number;
  totalVendido:     number;
}

export interface PromocionReporte {
  promocionId:         number;
  descripcion:         string;
  combosVendidos:      number;
  numeroTransacciones: number;
  ventaTotal:          number;
  gananciaTotal:       number;
  ultimaVenta:         string | null;
}

/** Costo y ganancia (solo administrador; el endpoint entero es solo de administrador). */
export interface CorteGanancia {
  costo:                number;
  ventaNormal:          number;
  gananciaNormal:       number;
  conDescuento:         number;
  gananciaConDescuento: number;
  hayDescuento:         boolean;
}

export interface CortePedido {
  pedidoId:    number;
  cliente:     string;
  articulos:   number;
  total:       number;
  pagado:      number;
  pagos:       number;
  dioAnticipo: boolean;
  saldo:       number;
  fechaPedido: string | null;
  fechaEntrega?: string | null;
  estado:      string;
  entregado:   boolean;
  ganancia:    CorteGanancia;
}

export interface CorteZona {
  /** null = «Sin zona» (se recoge en la tienda). */
  zonaId:    number | null;
  zona:      string;
  /** Lo que falta por cobrar en la zona. */
  subtotal:  number;
  totalPedidos: number;
  totalPagado:  number;
  cantidad:  number;
  articulos: number;
  ganancia:  CorteGanancia;
  pedidos:   CortePedido[];
}

/** Filtros del corte: zona, fechas del pedido (yyyy-MM-dd), pago y entrega. */
export interface CorteFiltros {
  /** Varias zonas a la vez; vacío = todas; 0 = «Sin zona» (se recoge en tienda). */
  zonas?:   number[];
  desde?:   string;
  hasta?:   string;
  pago:     'POR_COBRAR' | 'PAGADOS' | 'TODOS';
  entrega:  'SIN_ENTREGAR' | 'ENTREGADOS' | 'TODOS';
}

export interface CorteDeCaja {
  generado:        string;
  /** Lo que falta por cobrar. */
  total:           number;
  totalPedidos:    number;
  totalPagado:     number;
  cantidadPedidos: number;
  articulos:       number;
  ganancia:        CorteGanancia;
  zonas:           CorteZona[];
}


// ── Reporte por categoría / por productos elegidos (solo administrador) ───────────────────────────────────────────────────────

export type VistaReporteCategoria = 'TODOS' | 'VENDIDOS' | 'NO_VENDIDOS';

/** Lo que se pide: categoría vacía = todo; sinCategoria = «Otros»; productoIds = solo esos productos. */
export interface FiltroReporteCategoria {
  desde:          string;
  hasta:          string;
  categoria?:     string;
  sinCategoria?:  boolean;
  productoIds?:   number[];
  vista:          VistaReporteCategoria;
}

export interface FilaReporteCategoria {
  productoId: number; nombre: string; codigoBarras: string | null; categoria: string | null;
  precioCompra: number | null; precioVenta: number | null; precioRebaja: number | null; precioRebajaCampana: number | null;
  piezasVendidas: number; ventas: number; totalVendido: number; costoVendido: number; gananciaVendida: number;
  porcentajeCalculado: number | null; calculoNuevo: boolean; porcentajeReal: number | null;
  fletePorPieza: number; sinFlete: boolean;
  porVender: number; gananciaPorVender: number; gananciaPorVenderRebaja: number; gananciaPorVenderCampana: number;
  gananciaTotal: number; gananciaTotalRebaja: number; gananciaTotalCampana: number;
  fleteEnLoVendido: number; fleteEnStock: number;
}

export interface TotalesReporteCategoria {
  productos: number; productosVendidos: number; productosSinVender: number;
  piezas: number; total: number; costo: number; gananciaVendida: number; margenRealPct: number | null;
  piezasPorVender: number; gananciaPorVender: number; gananciaTotal: number;
  gananciaPorVenderRebaja: number; gananciaPorVenderCampana: number; gananciaTotalRebaja: number; gananciaTotalCampana: number;
  fleteVendido: number; fleteEnStock: number;
}

export interface PaginaReporteCategoria {
  descripcion: string; filas: FilaReporteCategoria[]; pagina: number; totalPaginas: number; totalRegistros: number; totales: TotalesReporteCategoria;
}

export type EstadoReporteGenerado = 'PENDIENTE' | 'GENERANDO' | 'LISTO' | 'ERROR';

export interface ReporteGenerado {
  id: number; estado: EstadoReporteGenerado; formato: 'XLSX' | 'PDF'; descripcion: string; nombreArchivo: string | null; error: string | null;
  creado: string; terminado: string | null; expira: string; bytes: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly base = `${environment.api_Url}/v1/reportes/ventas`;

  constructor(private readonly http: HttpClient) {}

  getDiario(fecha: string): Observable<ReporteDiario> {
    return this.http
      .get<{ data: ReporteDiario }>(`${this.base}/diario?fecha=${fecha}`)
      .pipe(map(r => r.data));
  }

  getMensual(mes: string): Observable<ReporteMensual> {
    return this.http
      .get<{ data: ReporteMensual }>(`${this.base}/mensual?mes=${mes}`)
      .pipe(map(r => r.data));
  }

  getCliente(clienteId: number): Observable<ReporteCliente> {
    return this.http
      .get<{ data: ReporteCliente }>(`${this.base}/cliente/${clienteId}`)
      .pipe(map(r => r.data));
  }

  getMasVendidos(desde: string, hasta: string, limite = 10): Observable<ProductoMasVendido[]> {
    return this.http
      .get<{ data: ProductoMasVendido[] }>(
        `${this.base}/productos-mas-vendidos?desde=${desde}&hasta=${hasta}&limite=${limite}`
      )
      .pipe(map(r => r.data ?? []));
  }

  getPromociones(desde?: string, hasta?: string): Observable<PromocionReporte[]> {
    const params: string[] = [];
    if (desde) params.push(`desde=${desde}`);
    if (hasta) params.push(`hasta=${hasta}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http
      .get<{ data: PromocionReporte[] }>(`${this.base}/promociones${qs}`)
      .pipe(map(r => r.data ?? []));
  }

  /** Corte de caja (solo administrador): pedidos por zona con los filtros elegidos. */
  getCorteDeCaja(f: CorteFiltros): Observable<CorteDeCaja> {
    const params: string[] = [`pago=${f.pago}`, `entrega=${f.entrega}`];
    (f.zonas ?? []).forEach(z => params.push(`zonaId=${z}`));
    if (f.desde) params.push(`desde=${f.desde}`);
    if (f.hasta) params.push(`hasta=${f.hasta}`);
    return this.http
      .get<{ data: CorteDeCaja }>(`${environment.api_Url}/v1/reportes/corte-caja?${params.join('&')}`)
      .pipe(map(r => r.data));
  }

  // ── Reporte por categoría / productos elegidos ──
  private get baseCategoria(): string { return `${this.base}/por-categoria`; }

  /** El reporte en pantalla (paginado, solo lectura). El back responde 400 con `mensaje` si algo del filtro no es válido. */
  getPorCategoria(f: FiltroReporteCategoria, pagina: number, size: number): Observable<PaginaReporteCategoria> {
    let params = new HttpParams().set('desde', f.desde).set('hasta', f.hasta).set('vista', f.vista)
      .set('pagina', String(pagina)).set('size', String(size));
    if (f.productoIds?.length) params = params.set('productoIds', f.productoIds.join(','));
    else if (f.sinCategoria) params = params.set('sinCategoria', 'true');
    else if (f.categoria) params = params.set('categoria', f.categoria);
    return this.http.get<{ data: PaginaReporteCategoria }>(this.baseCategoria, { params }).pipe(map(r => r.data));
  }

  /** Pide el Excel o PDF: el back lo arma en segundo plano y responde al instante con su id (PENDIENTE). */
  generarReporteCategoria(f: FiltroReporteCategoria, formato: 'XLSX' | 'PDF'): Observable<ReporteGenerado> {
    return this.http.post<{ data: ReporteGenerado }>(`${this.baseCategoria}/generar`, {
      desde: f.desde, hasta: f.hasta, categoria: f.categoria || null, sinCategoria: !!f.sinCategoria, productoIds: f.productoIds ?? [], vista: f.vista, formato
    }).pipe(map(r => r.data));
  }

  /** Mis últimos reportes pedidos (la lista viene en `lista`; vacía responde 404). */
  getReportesGenerados(): Observable<ReporteGenerado[]> {
    return this.http.get<{ lista: ReporteGenerado[] }>(`${this.baseCategoria}/generados`).pipe(map(r => r.lista ?? []));
  }

  getEstadoReporteGenerado(id: number): Observable<ReporteGenerado> {
    return this.http.get<{ data: ReporteGenerado }>(`${this.baseCategoria}/generados/${id}`).pipe(map(r => r.data));
  }

  descargarReporteGenerado(id: number): Observable<Blob> {
    return this.http.get(`${this.baseCategoria}/generados/${id}/archivo`, { responseType: 'blob' });
  }
}
