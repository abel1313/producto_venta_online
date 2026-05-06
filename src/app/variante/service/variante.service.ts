import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IVariante, IVarianteDto, IVarianteImagenPaginable, IVarianteRequest, IVarianteResumen, IVarianteResumenPaginable } from '../models/variante.model';
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
    return this.http.get<{ data: IVariante }>(`${this.url}/getOne/${id}`)
      .pipe(map(res => res.data));
  }

  getPorProducto(productoId: number): Observable<IVarianteDto[]> {
    return this.http.get<{ data: IVarianteDto[] }>(`${this.url}/porProducto/${productoId}`)
      .pipe(map(res => res.data));
  }

  getPorProductoPaginadoResumen(productoId: number, pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ data: IVarianteResumenPaginable }>(
      `${this.url}/porProducto/${productoId}/paginado/resumen?pagina=${pagina}&size=${size}`
    ).pipe(map(res => res.data));
  }

  buscar(params: { termino: string; pagina?: number; size?: number }): Observable<IVarianteResumenPaginable> {
    const { termino, pagina = 1, size = 10 } = params;
    const q = `termino=${encodeURIComponent(termino)}&pagina=${pagina}&size=${size}`;
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/buscar?${q}`)
      .pipe(map(res => res.data));
  }

  /** Crea/actualiza una o varias variantes en una sola petición. */
  save(data: IVarianteRequest[]): Observable<{ data: IVariante[] }> {
    return this.http.post<{ data: IVariante[] }>(`${this.url}/guardarConImagenes`, data);
  }

  update(id: number, data: IVarianteRequest): Observable<{ data: IVariante[] }> {
    return this.http.post<{ data: IVariante[] }>(`${this.url}/guardarConImagenes`, [{ ...data, id }]);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/delete`, { body: id });
  }

  eliminarImagenes(varianteId: number, imageIds: string[]): Observable<{ data: string }> {
    return this.http.delete<{ data: string }>(`${this.url}/${varianteId}/imagenes`, { body: imageIds });
  }

  getImagenesPaginado(id: number, pagina: number, size: number): Observable<IVarianteImagenPaginable> {
    return this.http.get<{ data: IVarianteImagenPaginable }>(
      `${this.url}/imagenes/${id}/paginado?pagina=${pagina}&size=${size}`
    ).pipe(map(res => res.data));
  }

  getAll(page: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/getAll?page=${page}&size=${size}`)
      .pipe(map(res => res.data));
  }

  getAdminSinStock(pagina: number, size: number): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ mensaje: string; data: IVarianteResumenPaginable }>(`${this.url}/admin/sin-stock?pagina=${pagina}&size=${size}`)
      .pipe(map(res => res.data));
  }

  inicializarDesdeProducto(form: FormData): Observable<{ mensaje: string; data: any[] }> {
    return this.http.post<{ mensaje: string; data: any[] }>(`${this.url}/inicializarDesdeProducto`, form);
  }

  guardarPedidoVariante(data: IPedidoVarianteDTO): Observable<any> {
    return this.http.post<any>(`${environment.api_Url}/pedidos/savePedido`, data);
  }

  saveVentaDirecta(data: IVentaDirectaRequest): Observable<IVentaDirectaResponse> {
    return this.http.post<IVentaDirectaResponse>(`${environment.api_Url}/ventas/save`, data);
  }
}

export interface IVentaDirectaRequest {
  usuarioId:     number;
  clienteId:     number;
  pagosYMesesId: number;
  detalles: {
    productoId:  number;
    varianteId:  number | null;
    cantidad:    number;
    precioVenta: number;
    subTotal:    number;
  }[];
}

export interface IVentaDirectaResponse {
  ventaId:          number;
  tipoPago:         string;
  requiereTerminal: boolean;
  totalVenta:       number;
  meses:            string | null;
  descripcionPago:  string;
}
