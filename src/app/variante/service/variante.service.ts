import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IFiltrosDisponibles, IVariante, IVarianteDto, IVarianteImagenDto, IVarianteImagenPaginable, IVarianteRequest, IVarianteResumen, IVarianteResumenPaginable } from '../models/variante.model';
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

  // Catálogo público con filtros combinables (AND). Todos los parámetros son opcionales — a
  // diferencia de /buscar, nunca 404: sin resultados devuelve t: [].
  buscarFiltrado(
    filtros: { termino?: string; precioMin?: number; precioMax?: number; talla?: string; color?: string; marca?: string },
    pagina = 1, size = 10
  ): Observable<IVarianteResumenPaginable> {
    let params = new HttpParams().set('pagina', String(pagina)).set('size', String(size));
    if (filtros.termino)   params = params.set('termino', filtros.termino);
    if (filtros.precioMin !== undefined) params = params.set('precioMin', String(filtros.precioMin));
    if (filtros.precioMax !== undefined) params = params.set('precioMax', String(filtros.precioMax));
    if (filtros.talla)  params = params.set('talla', filtros.talla);
    if (filtros.color)  params = params.set('color', filtros.color);
    if (filtros.marca)  params = params.set('marca', filtros.marca);

    return this.http.get<{ data: IVarianteResumenPaginable }>(`${this.url}/v1/buscar-filtrado`, { params })
      .pipe(map(res => res.data));
  }

  // Valores reales del catálogo visible (para armar dropdowns/slider sin adivinar opciones).
  filtrosDisponibles(): Observable<IFiltrosDisponibles> {
    return this.http.get<{ data: IFiltrosDisponibles }>(`${this.url}/v1/filtros-disponibles`)
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

  // Filtro combinado de admin: cada dimension es independiente y tri-estado (true/false/omitido
  // = cualquiera), se combinan entre si con AND. nombreOCodigo se combina libremente con los 3.
  adminFiltrar(
    filtros: { nombreOCodigo?: string; conStock?: boolean; conImagenes?: boolean; habilitado?: boolean;
               codigoGenerado?: boolean },
    pagina: number, size: number
  ): Observable<IVarianteResumenPaginable> {
    let params = new HttpParams()
      .set('pagina', String(pagina))
      .set('size', String(size));

    if (filtros.nombreOCodigo) params = params.set('nombreOCodigo', filtros.nombreOCodigo);
    if (filtros.conStock !== undefined) params = params.set('conStock', String(filtros.conStock));
    if (filtros.conImagenes !== undefined) params = params.set('conImagenes', String(filtros.conImagenes));
    if (filtros.habilitado !== undefined) params = params.set('habilitado', String(filtros.habilitado));
    // true = solo borradores de carga rápida con código autogenerado (BRD-...);
    // false = solo código real; omitido = ambos. Filtra por el producto padre.
    if (filtros.codigoGenerado !== undefined) params = params.set('codigoGenerado', String(filtros.codigoGenerado));

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

  independizar(varianteId: number, body: IIndependizarRequest): Observable<{ mensaje: string; data: IIndependizarResponse }> {
    return this.http.post<{ mensaje: string; data: IIndependizarResponse }>(
      `${this.url}/v1/${varianteId}/independizar`, body
    );
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

  // "Agregar mi compra" — el cliente vincula a su cuenta una venta de mostrador que se
  // registró con clienteSinRegistro. Requiere sesión (cualquier cliente, no admin).
  reclamarVenta(codigo: string): Observable<{ data: string }> {
    return this.http.post<{ data: string }>(`${environment.api_Url}/v1/ventas/reclamar`, { codigo });
  }

  // ── Cliente sin registro con verificación de correo (2026-07-22) ─────────
  // Antes "Agregar cliente sin registro" solo guardaba el formulario en memoria y se
  // mandaba embebido (clienteSinRegistroDto) hasta el POST de la venta — sin verificar
  // nada. Ahora se crea primero (con correoVerificado=false) para poder verificar el
  // correo ANTES de cobrar; solo cuenta para la elegibilidad de rifa si queda verificado
  // o si el cliente dio teléfono.
  crearClienteSinRegistro(dto: IClienteSinRegistro): Observable<IClienteSinRegistroCreado> {
    return this.http.post<{ data: IClienteSinRegistroCreado }>(`${environment.api_Url}/v1/clientes-sin-registro`, dto)
      .pipe(map(r => r.data));
  }

  enviarCodigoClienteSinRegistro(id: number): Observable<any> {
    return this.http.post<any>(`${environment.api_Url}/v1/clientes-sin-registro/${id}/enviar-codigo`, {});
  }

  verificarCodigoClienteSinRegistro(id: number, codigo: string): Observable<any> {
    return this.http.post<any>(`${environment.api_Url}/v1/clientes-sin-registro/${id}/verificar-codigo`, { codigo });
  }
}

export interface IVentaDirectaRequest {
  usuarioId:     number;
  clienteId:     number;
  pagosYMesesId?: number;
  montoDado?:    number;
  tipoPedido?:   'NORMAL' | 'APARTADO' | 'FIADO';
  observaciones?: string;
  nombreReceptor?: string;
  direccionEntrega?: string;
  fechaEntrega?: string;
  clienteSinRegistroDto?: IClienteSinRegistro,
  // Preferido: id de un ClienteSinRegistro ya creado/verificado (POST /v1/clientes-sin-registro).
  // clienteSinRegistroDto queda como fallback por compatibilidad — el flujo nuevo del front
  // siempre manda el id una vez que el modal ya lo creó.
  clienteSinRegistroId?: number,
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

// Response de POST /v1/clientes-sin-registro — misma entidad, en camelCase real
// (el request sigue en snake_case porque así lo espera el back en ese endpoint).
export interface IClienteSinRegistroCreado {
  id: number;
  nombrePersona: string;
  segundoNombre: string | null;
  apeidoPaterno: string | null;
  apeidoMaterno: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  correoElectronico: string | null;
  numeroTelefonico: string | null;
  correoVerificado: boolean;
  codigoVerificacion: string | null;
  codigoVerificacionExpira: string | null;
}
export interface IIndependizarRequest {
  nombre: string;
  descripcion?: string;
  marca?: string;
  color?: string;
  contenido?: string;
  piezas?: number;
  precioCosto: number;
  precioVenta: number;
  precioRebaja?: number;
  palabraClaveId?: number | null;
  codigoBarras: string;
  imagenPrincipalId?: string | null;
}

export interface IIndependizarResponse {
  productoNuevoId: number;
  codigoBarras: string;
  stockProductoOrigenRestante: number;
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
