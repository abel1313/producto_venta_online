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

  get variantesCache(): IVarianteResumen[] { return this._cache; }
  get paginaCache(): number { return this._paginaCache; }
  get totalPaginasCache(): number { return this._totalPaginasCache; }
  get initialized(): boolean { return this._initialized; }

  setCache(variantes: IVarianteResumen[], pagina: number, totalPaginas: number): void {
    this._cache = variantes;
    this._paginaCache = pagina;
    this._totalPaginasCache = totalPaginas;
    this._initialized = true;
  }

  invalidarCache(): void {
    this._initialized = false;
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

  buscar(params: { nombre?: string; codigoBarras?: string; pagina?: number; size?: number }): Observable<IVarianteResumenPaginable> {
    const { nombre, codigoBarras, pagina = 1, size = 10 } = params;
    let q = codigoBarras
      ? `codigoBarras=${encodeURIComponent(codigoBarras)}`
      : `nombre=${encodeURIComponent(nombre ?? '')}`;
    q += `&pagina=${pagina}&size=${size}`;
    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/buscar?${q}`)
      .pipe(map(res => res.data));
  }

  /** Crea o actualiza variante — mismo endpoint. Si data.id está presente → actualiza. */
  save(data: IVarianteRequest): Observable<{ data: IVariante }> {
    return this.http.post<{ data: IVariante }>(`${this.url}/guardarConImagenes`, data);
  }

  update(id: number, data: IVarianteRequest): Observable<{ data: IVariante }> {
    return this.http.post<{ data: IVariante }>(`${this.url}/guardarConImagenes`, { ...data, id });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/delete`, { body: id });
  }

  getImagenesPaginado(id: number, pagina: number, size: number): Observable<IVarianteImagenPaginable> {
    return this.http.get<{ data: IVarianteImagenPaginable }>(
      `${this.url}/imagenes/${id}/paginado?pagina=${pagina}&size=${size}`
    ).pipe(map(res => res.data));
  }

  guardarPedidoVariante(data: IPedidoVarianteDTO): Observable<any> {
    return this.http.post<any>(`${environment.api_Url}/pedidos/savePedido`, data);
  }
}
