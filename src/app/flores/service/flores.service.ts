import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IAccesorioRamo, ICalcularPrecioRequest, ICalcularPrecioResponse, ICantidadFlor,
  ICantidadFlorRequest, IColorFlor, IColorFlorRequest, IFraseListon, IFrasesPendientesPaginable,
  IRamoArmado, IRamoArmadoPaginable, IRamoArmadoRequest, IRamoPedidoDetalle,
  IRamoPedidoDetalleRequest, ITipoFlor, IValidarCantidadRequest, IValidarCantidadResponse,
  IValidarFraseRequest, IValidarFraseResponse
} from '../models/flores.model';

/**
 * Endpoints del módulo "Flores eternas".
 *
 * Los GET de los 4 catálogos y los 2 de cálculo son **públicos** (el cliente configura su ramo
 * sin sesión). `save`/`update`/`delete` son ADMIN.
 *
 * ⚠️ Reglas heredadas del CRUD genérico, ya conocidas de `lugares-entrega` y `cinta`:
 * - `getAll` exige `page` (base-0) y `size` en la URL — no tienen default, sin ellos falla.
 * - `delete` recibe el id **crudo** en el body (`1`), NUNCA `{ id: 1 }`.
 * - `save`/`update` reciben el objeto completo de la entidad, no un DTO envuelto.
 */
@Injectable({ providedIn: 'root' })
export class FloresService {

  private readonly base = environment.api_Url;

  private readonly urlTipos      = `${this.base}/v1/tipos-flor`;
  private readonly urlColores    = `${this.base}/v1/colores-flor`;
  private readonly urlCantidades = `${this.base}/v1/cantidades-flor`;
  private readonly urlAccesorios = `${this.base}/v1/accesorios-ramo`;
  private readonly urlFrases     = `${this.base}/v1/frases-liston`;
  private readonly urlRamos      = `${this.base}/v1/ramos-armados`;
  private readonly urlCalculo    = `${this.base}/v1/flores`;

  constructor(private readonly http: HttpClient) {}

  // ── Tipos de flor ──────────────────────────────────────────────────────────

  tiposGetAll(page = 0, size = 200): Observable<ITipoFlor[]> {
    return this.http.get<{ data: ITipoFlor[] }>(`${this.urlTipos}/getAll?page=${page}&size=${size}`)
      .pipe(map(r => r?.data ?? []));
  }

  tipoSave(body: Omit<ITipoFlor, 'id'>): Observable<ITipoFlor> {
    return this.http.post<{ data: ITipoFlor }>(`${this.urlTipos}/save`, body).pipe(map(r => r.data));
  }

  tipoUpdate(item: ITipoFlor): Observable<ITipoFlor> {
    return this.http.put<{ data: ITipoFlor }>(`${this.urlTipos}/update/${item.id}`, item).pipe(map(r => r.data));
  }

  tipoDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlTipos}/delete`, { body: id });
  }

  // ── Cantidades válidas ─────────────────────────────────────────────────────

  cantidadesGetAll(page = 0, size = 200): Observable<ICantidadFlor[]> {
    return this.http.get<{ data: ICantidadFlor[] }>(`${this.urlCantidades}/getAll?page=${page}&size=${size}`)
      .pipe(map(r => r?.data ?? []));
  }

  cantidadSave(body: ICantidadFlorRequest): Observable<ICantidadFlor> {
    return this.http.post<{ data: ICantidadFlor }>(`${this.urlCantidades}/save`, body).pipe(map(r => r.data));
  }

  cantidadUpdate(body: ICantidadFlorRequest): Observable<ICantidadFlor> {
    return this.http.put<{ data: ICantidadFlor }>(`${this.urlCantidades}/update/${body.id}`, body)
      .pipe(map(r => r.data));
  }

  cantidadDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlCantidades}/delete`, { body: id });
  }

  // ── Colores de flor ────────────────────────────────────────────────────────

  coloresGetAll(page = 0, size = 200): Observable<IColorFlor[]> {
    return this.http.get<{ data: IColorFlor[] }>(`${this.urlColores}/getAll?page=${page}&size=${size}`)
      .pipe(map(r => r?.data ?? []));
  }

  /** Colores activos de una especie. Es el que alimenta el selector de color del cliente. */
  /**
   * ⚠️ **Este endpoint devuelve el arreglo en `lista`, NO en `data`** — es el único de todo el
   * módulo que lo hace así. Verificado contra QA (2026-08-13):
   *
   * ```
   * GET /v1/colores-flor/por-tipo-flor/1  → { data: null,  lista: [ {...}, {...} ] }
   * GET /v1/colores-flor/getAll           → { data: [...], lista: null }
   * ```
   *
   * Leer `data` acá devolvía SIEMPRE lista vacía, y el configurador mostraba "esta especie
   * todavía no tiene colores disponibles" aunque el catálogo sí los tuviera dados de alta —
   * sin ningún error en consola, porque la petición respondía 200 correctamente.
   *
   * Se leen los dos campos por si algún día lo normalizan: así funciona antes y después.
   */
  coloresPorTipoFlor(tipoFlorId: number): Observable<IColorFlor[]> {
    return this.http
      .get<{ data: IColorFlor[] | null; lista: IColorFlor[] | null }>(`${this.urlColores}/por-tipo-flor/${tipoFlorId}`)
      .pipe(map(r => r?.lista ?? r?.data ?? []));
  }

  colorSave(body: IColorFlorRequest): Observable<IColorFlor> {
    return this.http.post<{ data: IColorFlor }>(`${this.urlColores}/save`, body).pipe(map(r => r.data));
  }

  colorUpdate(body: IColorFlorRequest): Observable<IColorFlor> {
    return this.http.put<{ data: IColorFlor }>(`${this.urlColores}/update/${body.id}`, body)
      .pipe(map(r => r.data));
  }

  colorDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlColores}/delete`, { body: id });
  }

  // ── Accesorios ─────────────────────────────────────────────────────────────

  accesoriosGetAll(page = 0, size = 200): Observable<IAccesorioRamo[]> {
    return this.http.get<{ data: IAccesorioRamo[] }>(`${this.urlAccesorios}/getAll?page=${page}&size=${size}`)
      .pipe(map(r => r?.data ?? []));
  }

  accesorioSave(body: Omit<IAccesorioRamo, 'id'>): Observable<IAccesorioRamo> {
    return this.http.post<{ data: IAccesorioRamo }>(`${this.urlAccesorios}/save`, body).pipe(map(r => r.data));
  }

  accesorioUpdate(item: IAccesorioRamo): Observable<IAccesorioRamo> {
    return this.http.put<{ data: IAccesorioRamo }>(`${this.urlAccesorios}/update/${item.id}`, item)
      .pipe(map(r => r.data));
  }

  accesorioDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlAccesorios}/delete`, { body: id });
  }

  // ── Frases de listón ───────────────────────────────────────────────────────

  frasesGetAll(page = 0, size = 200): Observable<IFraseListon[]> {
    return this.http.get<{ data: IFraseListon[] }>(`${this.urlFrases}/getAll?page=${page}&size=${size}`)
      .pipe(map(r => r?.data ?? []));
  }

  fraseSave(body: Omit<IFraseListon, 'id'>): Observable<IFraseListon> {
    return this.http.post<{ data: IFraseListon }>(`${this.urlFrases}/save`, body).pipe(map(r => r.data));
  }

  fraseUpdate(item: IFraseListon): Observable<IFraseListon> {
    return this.http.put<{ data: IFraseListon }>(`${this.urlFrases}/update/${item.id}`, item)
      .pipe(map(r => r.data));
  }

  fraseDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.urlFrases}/delete`, { body: id });
  }

  // ── Ramos preconfigurados ──────────────────────────────────────────────────
  // ⚠️ `pagina` es base-1 aquí (estilo /v1/promociones), NO base-0 como los catálogos.

  ramosAdmin(pagina = 1, size = 10): Observable<IRamoArmadoPaginable> {
    return this.http.get<{ data: IRamoArmadoPaginable }>(`${this.urlRamos}/admin?pagina=${pagina}&size=${size}`)
      .pipe(map(r => r.data));
  }

  ramosActivos(pagina = 1, size = 10): Observable<IRamoArmadoPaginable> {
    return this.http.get<{ data: IRamoArmadoPaginable }>(`${this.urlRamos}/activos?pagina=${pagina}&size=${size}`)
      .pipe(map(r => r.data));
  }

  ramoCrear(body: IRamoArmadoRequest): Observable<IRamoArmado> {
    return this.http.post<{ data: IRamoArmado }>(this.urlRamos, body).pipe(map(r => r.data));
  }

  ramoEditar(id: number, body: IRamoArmadoRequest): Observable<IRamoArmado> {
    return this.http.put<{ data: IRamoArmado }>(`${this.urlRamos}/${id}`, body).pipe(map(r => r.data));
  }

  ramoToggleActivo(id: number, activo: boolean): Observable<IRamoArmado> {
    return this.http.put<{ data: IRamoArmado }>(`${this.urlRamos}/${id}/activo`, { activo })
      .pipe(map(r => r.data));
  }

  // ── Motor de cálculo (público) ─────────────────────────────────────────────

  validarCantidad(body: IValidarCantidadRequest): Observable<IValidarCantidadResponse> {
    return this.http.post<{ data: IValidarCantidadResponse }>(`${this.urlCalculo}/validar-cantidad`, body)
      .pipe(map(r => r.data));
  }

  calcularPrecio(body: ICalcularPrecioRequest): Observable<ICalcularPrecioResponse> {
    return this.http.post<{ data: ICalcularPrecioResponse }>(`${this.urlCalculo}/calcular-precio`, body)
      .pipe(map(r => r.data));
  }

  // ── Ticket de producción del ramo + frases pendientes ──────────────────────

  /** Se llama DESPUÉS de `savePedido`. Ver nota en `IRamoPedidoDetalleRequest`. */
  guardarDetalleRamo(pedidoId: number, body: IRamoPedidoDetalleRequest): Observable<IRamoPedidoDetalle> {
    return this.http
      .post<{ data: IRamoPedidoDetalle }>(`${this.urlCalculo}/pedidos/${pedidoId}/detalle`, body)
      .pipe(map(r => r.data));
  }

  obtenerDetalleRamo(pedidoId: number): Observable<IRamoPedidoDetalle> {
    return this.http
      .get<{ data: IRamoPedidoDetalle }>(`${this.urlCalculo}/pedidos/${pedidoId}/detalle`)
      .pipe(map(r => r.data));
  }

  /** Bandeja de frases por aprobar — ADMIN. `pagina` base-1. */
  frasesPendientes(pagina = 1, size = 10): Observable<IFrasesPendientesPaginable> {
    return this.http
      .get<{ data: IFrasesPendientesPaginable }>(`${this.urlCalculo}/pedidos/frases-pendientes?pagina=${pagina}&size=${size}`)
      .pipe(map(r => r.data));
  }

  /**
   * Aprueba (con precio) o rechaza una frase personalizada. Al aprobar, el back crea solo el
   * pedido APARTADO del anticipo y devuelve su id — el cobro se registra después con
   * `POST /v1/abonos/{pedidoAnticipoId}`, el flujo de abonos que ya existe.
   */
  validarFrase(detalleId: number, body: IValidarFraseRequest): Observable<IValidarFraseResponse> {
    return this.http
      .put<{ data: IValidarFraseResponse }>(`${this.urlCalculo}/pedidos/detalle/${detalleId}/validar-frase`, body)
      .pipe(map(r => r.data));
  }
}
