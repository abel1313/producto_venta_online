import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IVariante, IVariantePaginable } from '../models/variante.model';

@Injectable({ providedIn: 'root' })
export class VarianteService {
  private readonly url = `${environment.api_Url}/variantes`;

  // Para pasar la variante al componente de edición
  private _varianteUpdate = new BehaviorSubject<IVariante | null>(null);
  varianteUpdate$ = this._varianteUpdate.asObservable();

  setVarianteUpdate(v: IVariante): void { this._varianteUpdate.next(v); }
  clearVarianteUpdate(): void { this._varianteUpdate.next(null); }
  get varianteParaEditar(): IVariante | null { return this._varianteUpdate.getValue(); }

  private _cache: IVariante[] = [];
  private _paginaCache = 1;
  private _totalPaginasCache = 0;
  private _initialized = false;

  get variantesCache(): IVariante[] { return this._cache; }
  get paginaCache(): number { return this._paginaCache; }
  get totalPaginasCache(): number { return this._totalPaginasCache; }
  get initialized(): boolean { return this._initialized; }

  setCache(variantes: IVariante[], pagina: number, totalPaginas: number): void {
    this._cache = variantes;
    this._paginaCache = pagina;
    this._totalPaginasCache = totalPaginas;
    this._initialized = true;
  }

  invalidarCache(): void {
    this._initialized = false;
  }

  constructor(private readonly http: HttpClient) {}

  getPaginado(pagina: number, size: number): Observable<IVariantePaginable> {
    return this.http.get<IVariantePaginable>(`${this.url}/paginado?pagina=${pagina}&size=${size}`);
  }

  getPorProducto(productoId: number): Observable<{ data: IVariante[] }> {
    return this.http.get<{ data: IVariante[] }>(`${this.url}/porProducto/${productoId}`);
  }

  buscar(params: { nombre?: string; codigoBarras?: string; pagina?: number; size?: number }): Observable<IVariantePaginable> {
    const { nombre, codigoBarras, pagina = 1, size = 10 } = params;
    let q = codigoBarras
      ? `codigoBarras=${encodeURIComponent(codigoBarras)}`
      : `nombre=${encodeURIComponent(nombre ?? '')}`;
    q += `&pagina=${pagina}&size=${size}`;
    return this.http.get<{ data: IVariantePaginable }>(`${this.url}/buscar?${q}`)
      .pipe(map(res => res.data));
  }

  save(data: IVariante): Observable<{ data: IVariante }> {
    return this.http.post<{ data: IVariante }>(`${this.url}/guardarConImagenes`, data);
  }

  update(id: number, data: IVariante): Observable<{ data: IVariante }> {
    return this.http.put<{ data: IVariante }>(`${this.url}/update/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.url}/delete`, { body: id });
  }
}
