import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IVariante, IVarianteDto, IVarianteImagenDto, IVarianteImagenPaginable, IVarianteRequest, IVarianteResumen, IVarianteResumenPaginable } from '../models/variante.model';
import { IPedidoVarianteDTO } from '../models/pedido-variante.model';

@Injectable({ providedIn: 'root' })
export class VarianteService {
  private readonly url = `${environment.api_Url}/variantes`;

  // Para pasar la variante al componente de edición
  private _varianteUpdate = new BehaviorSubject<IVariante | null>(null);
  varianteUpdate$ = this._varianteUpdate.asObservable();

  setVarianteUpdate(v: IVariante): void { this._varianteUpdate.next(v); }
  clearVarianteUpdate(): void { this._varianteUpdate.next(null); }
  get varianteParaEditar(): IVariante | null { return this._varianteUpdate.getValue(); }

  private _cache: IVarianteResumen[] = [];
  private _paginaCache = 1;
  private _totalPaginasCache = 0;
  private _initialized = false;
  private _terminoCache = '';

  get variantesCache(): IVarianteResumen[] { return this._cache; }
  get paginaCache(): number { return this._paginaCache; }
  get totalPaginasCache(): number { return this._totalPaginasCache; }
  get initialized(): boolean { return this._initialized; }
  get terminoCache(): string { return this._terminoCache; }

  setCache(variantes: IVarianteResumen[], pagina: number, totalPaginas: number, termino = ''): void {
    this._cache = variantes;
    this._paginaCache = pagina;
    this._totalPaginasCache = totalPaginas;
    this._terminoCache = termino;
    this._initialized = true;
  }

  invalidarCache(): void {
    this._initialized = false;
    this._terminoCache = '';
  }

  constructor(private readonly http: HttpClient) {}

  getPaginado(pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/paginado?pagina=${pagina}&size=${size}`)
      .pipe(map(res => res.data));
  }

  getOne(id: number): Observable<IVariante> {
    return this.http.get<{ data: IVariante }>(`${this.url}/v1/getOne/${id}`)
      .pipe(map(res => res.data));
  }

  getPorProducto(productoId: number): Observable<IVarianteDto[]> {
    return this.http.get<{ data: IVarianteDto[] }>(`${this.url}/v1/porProducto/${productoId}`)
      .pipe(map(res => res.data));
  }

  getPorProductoPaginadoResumen(productoId: number, pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ data: IVarianteResumenPaginable }>(
      `${this.url}/v1/porProducto/${productoId}/paginado/resumen?pagina=${pagina}&size=${size}`
    ).pipe(map(res => res.data));
  }

  buscar(params: { termino: string; pagina?: number; size?: number }): Observable<IVarianteResumenPaginable> {
    const { termino, pagina = 1, size = 10 } = params;
    const q = `termino=${encodeURIComponent(termino)}&pagina=${pagina}&size=${size}`;
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/v1/buscar?${q}`)
      .pipe(map(res => res.data));
  }

  /** Crea/actualiza una o varias variantes en una sola petición. */
  save(data: IVarianteRequest[]): Observable<{ data: IVariante[] }> {
    return this.http.post<{ data: IVariante[] }>(`${this.url}/v1/guardarConImagenes`, data);
  }

  update(id: number, data: IVarianteRequest): Observable<{ data: IVariante[] }> {
    return this.http.post<{ data: IVariante[] }>(`${this.url}/v1/guardarConImagenes`, [{ ...data, id }]);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/v1/delete`, { body: id });
  }

  eliminarImagenes(varianteId: number, imageIds: string[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.url}/v1/${varianteId}/imagenes`, { body: imageIds });
  }

  eliminarImagenesV2(varianteId: number, imageIds: string[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.url}/v1/${varianteId}/imagenes`, { body: imageIds });
  }

  eliminarTodasImagenesVariantes(varianteIds: number[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.url}/v1/imagenes`, { body: varianteIds });
  }

  eliminarTodasImagenesVariantesV2(varianteIds: number[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.url}/v1/imagenes`, { body: varianteIds });
  }

  getImagenesPaginado(id: number, pagina: number, size: number): Observable<IVarianteImagenPaginable> {
    return this.http.get<{ data: IVarianteImagenPaginable }>(
      `${this.url}/v1/imagenes/${id}/paginado?pagina=${pagina}&size=${size}`
    ).pipe(map(res => res.data));
  }

  getImagenesVariante(varianteId: number): Observable<IVarianteImagenDto[]> {
    return this.http.get<{ data: IVarianteImagenDto[] }>(`${this.url}/v1/imagenes/${varianteId}`)
      .pipe(map(res => res?.data ?? []));
  }

  getImagenesVarianteV2(varianteId: number): Observable<IVarianteImagenDto[]> {
    return this.http.get<{ data: IVarianteImagenDto[] }>(`${this.url}/v1/imagenes/${varianteId}`)
      .pipe(map(res => res?.data ?? []));
  }

  setPrincipalVariante(imagenId: string): Observable<any> {
    return this.http.put<any>(`${this.url}/v1/imagenes/${imagenId}/principal`, null);
  }

  getAll(page: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/v1/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data));
  }

  getAdminSinStock(pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ mensaje: string; data: IVarianteResumenPaginable }>(`${this.url}/v1/admin/sin-stock?pagina=${pagina}&size=${size}`)
      .pipe(map(res => res.data));
  }

  adminFiltrar(filtro: 'SIN_STOCK' | 'CON_STOCK' | 'CON_IMAGENES' | 'CON_STOCK_Y_IMAGENES' | 'NO_HABILITADOS', pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    let params = new HttpParams()
      .set('pagina', String(pagina))
      .set('size', String(size));

    switch (filtro) {
      case 'SIN_STOCK':            params = params.set('conStock', 'false'); break;
      case 'CON_STOCK':            params = params.set('conStock', 'true'); break;
      case 'CON_IMAGENES':         params = params.set('conImagenes', 'true'); break;
      case 'CON_STOCK_Y_IMAGENES': params = params.set('conStock', 'true').set('conImagenes', 'true'); break;
      case 'NO_HABILITADOS':       params = params.set('habilitado', 'false'); break;
    }

    return this.http.get<{ mensaje: string; data: IVarianteResumenPaginable }>(`${this.url}/v1/admin/filtrar`, { params })
      .pipe(map(res => res.data));
  }

  habilitarVariante(id: number, habilitar: boolean): Observable<any> {
    return this.http.put(`${this.url}/v1/${id}/habilitar?habilitar=${habilitar}`, {});
  }

  habilitarLote(ids: number[], habilitar: boolean): Observable<any> {
    return this.http.put(`${this.url}/v1/admin/habilitar-lote`, { ids, habilitar });
  }

  inicializarDesdeProducto(form: FormData): Observable<{ mensaje: string; data: any[] }> {
    return this.http.post<{ mensaje: string; data: any[] }>(`${this.url}/v1/inicializarDesdeProducto`, form);
  }

  diagnosticoImagenes(varianteId: number): Observable<any> {
    return this.http.get(`${this.url}/v1/admin/diagnostico-imagenes/${varianteId}`);
  }

  guardarPedidoVariante(data: IPedidoVarianteDTO): Observable<any> {
    return this.http.post<any>(`${environment.api_Url}/v1/pedidos/savePedido`, data);
  }

  saveVentaDirecta(data: IVentaDirectaRequest): Observable<IVentaDirectaResponse> {
    return this.http.post<IVentaDirectaResponse>(`${environment.api_Url}/v1/ventas/save`, data);
  }
}

export interface IVentaDirectaRequest {
  usuarioId:     number;
  clienteId:     number;
  pagosYMesesId?: number;
  montoDado?:    number;
  tipoPedido?:   'NORMAL' | 'APARTADO' | 'FIADO';
  observaciones?: string;
  clienteSinRegistroDto?: IClienteSinRegistro,
  detalles: {
    productoId:   number;
    varianteId:   number | null;
    cantidad:     number;
    precioVenta:  number;
    subTotal:     number;
    promocionId?: number;
  }[];
  notificacion?: {
    enviarCorreo?:   boolean;
    correo?:         string;
    ticketHtml?:     string;
  };
}

export interface IClienteSinRegistro {
      nombre_persona: string;
      segundo_nombre: string;
      apeido_Paterno: string;
      apeido_Materno: string;
      fecha_Nacimiento: string;
      sexo: string;
      correo_Electronico: string;
      numero_Telefonico: string;
}
export interface IVentaDirectaResponse {
  ventaId:          number | null;
  pedidoId:         number | null;
  tipoPago:         string | null;
  requiereTerminal: boolean;
  totalVenta:       number;
  meses:            string | null;
  descripcionPago:  string | null;
  correoEnviado?:   boolean;
  whatsappEnviado?: boolean;
  erroresEnvio?:    string[];
}
