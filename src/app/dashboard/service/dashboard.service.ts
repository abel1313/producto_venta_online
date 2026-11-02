import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface DashboardResumen {
  ventasHoy: number;
  ventasMes: number;
  gananciaMes: number;
  gastosMes: number;
  gananciaNetaMes: number;
  pedidosPendientesEntregar: number;
  creditosActivos: number;
  montoPorCobrar: number;
  productosStockBajo: number;
}

/** Una forma de pago y qué parte de lo vendido representa (`porcentaje` de 0 a 100). `comision` = lo que se queda la terminal. */
export interface FormaDePagoVentas {
  forma:      string;
  ventas:     number;
  total:      number;
  porcentaje: number;
  comision:   number;
}

export interface VentasPorFormaDePago {
  desde:         string;
  hasta:         string;
  total:         number;
  comisionTotal: number;
  /** De la que más vendió a la que menos. Vacío si no hubo ventas en el periodo. */
  formas:        FormaDePagoVentas[];
}

/** Un mes de la gráfica de ventas, gastos y ganancia (`mes` = yyyy-MM). `gananciaNeta` = ganancia − gastos. */
export interface MesDeVentas {
  mes:          string;
  numeroVentas: number;
  ventas:       number;
  ganancia:     number;
  gastos:       number;
  gananciaNeta: number;
}

export interface TramoPorCobrar { etiqueta: string; pedidos: number; saldo: number; }

export interface CasoPorCobrar {
  pedidoId: number;
  cliente:  string;
  /** Ya viene en palabras del dueño: «Apartado» o «Ir pagando». */
  tipo:     string;
  saldo:    number;
  dias:     number;
}

/** Lo que te deben (Apartados e Ir pagando). `total` es el de la tarjeta «Por cobrar». Siempre 3 tramos. */
export interface DineroPorCobrar {
  total:       number;
  pedidos:     number;
  tramos:      TramoPorCobrar[];
  masAntiguos: CasoPorCobrar[];
}

export interface ArticuloQuieto {
  articuloId:    number;
  nombre:        string;
  stock:         number;
  costo:         number;
  capital:       number;
  /** null = nunca se ha vendido. */
  ultimaVenta:   string | null;
  diasSinVender: number | null;
}

/** Mercancía con stock sin ventas en `dias` días, a costo. `mayores` = hasta 10 con más capital. */
export interface CapitalParado {
  dias:      number;
  articulos: number;
  piezas:    number;
  capital:   number;
  mayores:   ArticuloQuieto[];
}

export interface ConteoPedidos { codigo: string; etiqueta: string; activo: boolean; pedidos: number; }

/** Siempre las 6 categorías en orden. Los abiertos (`activo`) se cuentan todos; Entregado y Cancelado solo los del periodo. */
export interface PedidosPorEstado {
  desde:     string;
  hasta:     string;
  activos:   number;
  atrasados: number;
  estados:   ConteoPedidos[];
}

export interface CeldaDeCalor { diaSemana: number; hora: number; ventas: number; total: number; }
export interface TotalDeDia { diaSemana: number; nombre: string; ventas: number; total: number; }

/** Cuándo se vende. `diaSemana`: 1 = lunes … 7 = domingo; `hora` 0–23. `celdas` solo trae lo que tuvo ventas. `mejorDia`/`mejorHora` null = sin ventas. */
export interface CuandoSeVende {
  desde:      string;
  hasta:      string;
  ventas:     number;
  total:      number;
  mejorDia:   number | null;
  mejorHora:  number | null;
  porDia:     TotalDeDia[];
  celdas:     CeldaDeCalor[];
}

export interface MesDeClientes { mes: string; nuevos: number; recurrentes: number; totalNuevos: number; totalRecurrentes: number; }
export interface MejorCliente { clienteId: number; nombre: string; ventas: number; total: number; }

/** Quién te compra (solo clientes registrados, sin ventas de mostrador). `porMes` trae todos los meses seguidos. */
export interface ClientesDelNegocio {
  meses:       number;
  clientes:    number;
  nuevos:      number;
  recurrentes: number;
  total:       number;
  porMes:      MesDeClientes[];
  mejores:     MejorCliente[];
}

export interface ZonaDeEntrega { zona: string; recogerEnTienda: boolean; pedidos: number; total: number; porcentaje: number; }

/** A dónde van los pedidos no cancelados del periodo, del lugar con más pedidos al que menos. */
export interface EntregasPorZona {
  desde:   string;
  hasta:   string;
  pedidos: number;
  total:   number;
  zonas:   ZonaDeEntrega[];
}

interface ResponseGeneric<T> { data: T; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly url = `${environment.api_Url}/v1/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getResumen(): Observable<DashboardResumen> {
    return this.http
      .get<ResponseGeneric<DashboardResumen>>(`${this.url}/resumen`)
      .pipe(map(r => r.data));
  }

  /** Cómo te pagaron entre dos fechas (sin fechas: del día 1 del mes a hoy). Las ventas devueltas no cuentan. */
  getVentasPorFormaPago(desde?: string, hasta?: string): Observable<VentasPorFormaDePago> {
    const params: string[] = [];
    if (desde) params.push(`desde=${desde}`);
    if (hasta) params.push(`hasta=${hasta}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http
      .get<ResponseGeneric<VentasPorFormaDePago>>(`${this.url}/graficas/ventas-por-forma-pago${qs}`)
      .pipe(map(r => r.data));
  }

  /** Ventas, ganancia, gastos y ganancia neta de los últimos `meses` meses (todos seguidos; sin movimiento = cero). */
  getVentasGastosMensual(meses = 12): Observable<MesDeVentas[]> {
    return this.http
      .get<ResponseGeneric<MesDeVentas[]>>(`${this.url}/graficas/ventas-gastos-mensual?meses=${meses}`)
      .pipe(map(r => r.data ?? []));
  }

  getPorCobrar(): Observable<DineroPorCobrar> {
    return this.http.get<ResponseGeneric<DineroPorCobrar>>(`${this.url}/graficas/por-cobrar`).pipe(map(r => r.data));
  }

  getCapitalParado(dias = 60): Observable<CapitalParado> {
    return this.http.get<ResponseGeneric<CapitalParado>>(`${this.url}/graficas/capital-parado?dias=${dias}`).pipe(map(r => r.data));
  }

  getPedidosPorEstado(dias = 90): Observable<PedidosPorEstado> {
    return this.http.get<ResponseGeneric<PedidosPorEstado>>(`${this.url}/graficas/pedidos-por-estado?dias=${dias}`).pipe(map(r => r.data));
  }

  getCuandoSeVende(dias = 90): Observable<CuandoSeVende> {
    return this.http.get<ResponseGeneric<CuandoSeVende>>(`${this.url}/graficas/cuando-se-vende?dias=${dias}`).pipe(map(r => r.data));
  }

  getClientes(meses = 6): Observable<ClientesDelNegocio> {
    return this.http.get<ResponseGeneric<ClientesDelNegocio>>(`${this.url}/graficas/clientes?meses=${meses}`).pipe(map(r => r.data));
  }

  getEntregasPorZona(dias = 90): Observable<EntregasPorZona> {
    return this.http.get<ResponseGeneric<EntregasPorZona>>(`${this.url}/graficas/entregas-por-zona?dias=${dias}`).pipe(map(r => r.data));
  }
}
