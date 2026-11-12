import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** `origen` es solo de pantalla (de qué campaña se tomó el precio al agregarlo); no se manda al back. */
export interface ICampanaProducto {
  productoId: number; nombre: string | null; codigoBarras?: string | null; precio: number; origen?: string | null;
  /** Solo para mostrar (vienen del catálogo, no se guardan con la campaña): el precio de venta y el precio con descuento del producto. */
  precioVenta?: number | null; precioRebaja?: number | null; stock?: number | null;
}

/** Respuesta del «Verificar»: OK = el código es de este cliente; NO_COINCIDE = es de otra persona; NO_EXISTE = no es de nadie. */
export interface IVerificacionCodigo {
  estado: 'OK' | 'NO_COINCIDE' | 'NO_EXISTE';
  nombre: string;
  acumulado: number;
  meta: number;
  falta: number;
}

export interface IPersonaReporte {
  personaId: number; codigo: string; nombre: string; correo: string | null; telefono: string | null;
  acumulado: number; pedidos: number; llegoALaMeta: boolean;
}

export interface IReporteCampana {
  campanaId: number; campana: string; meta: number; totalPersonas: number; llegaronALaMeta: number; totalAcumulado: number;
  personas: IPersonaReporte[];
}

/** Respuesta de escanear un QR (`buscar-por-codigo`): a quién pertenece el código y cuánto lleva en la campaña vigente. */
export interface IBuscarPorCodigo {
  valido: boolean;
  /** Cliente registrado de su primera compra (o null). */
  clienteId: number | null;
  /** Cliente sin registro de su primera compra (o null). Los dos pueden ser null en códigos anteriores al ligado. */
  clienteSinRegistroId: number | null;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  acumulado: number;
  meta: number;
  falta: number;
}

export interface ICampana {
  id?: number;
  nombre: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  metaMonto: number;
  /** Solo lectura: encendida. */
  activa?: boolean;
  /** Solo lectura: encendida y dentro de sus fechas hoy. */
  vigente?: boolean;
  productos: ICampanaProducto[];
}

/**
 * Campañas (eventos con fechas y precio de campaña). Contrato: `CAMBIOS_FRONT.md` del back, sección «Campañas — configuración» (2026-11-07).
 * Todo es solo administrador salvo que `activa()` se usa para saber si hay un evento vigente.
 */
@Injectable({ providedIn: 'root' })
export class CampanasService {

  private readonly url = `${environment.api_Url}/v1/campanas`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<ICampana[]> {
    return this.http.get<{ lista: ICampana[] }>(this.url).pipe(map(r => r?.lista ?? []));
  }

  /** La campaña vigente hoy, o null si no hay (o no hay permiso): el front no muestra nada de campaña. */
  activa(): Observable<ICampana | null> {
    return this.http.get<{ data: ICampana | null }>(`${this.url}/activa`).pipe(map(r => r?.data ?? null), catchError(() => of(null)));
  }

  private cuerpo(c: ICampana): unknown {
    return {
      nombre: c.nombre.trim(), fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, metaMonto: +c.metaMonto || 0,
      precios: c.productos.map(p => ({ productoId: p.productoId, precio: +p.precio }))
    };
  }

  crear(c: ICampana): Observable<ICampana> {
    return this.http.post<{ data: ICampana }>(this.url, this.cuerpo(c)).pipe(map(r => r.data));
  }

  actualizar(id: number, c: ICampana): Observable<ICampana> {
    return this.http.put<{ data: ICampana }>(`${this.url}/${id}`, this.cuerpo(c)).pipe(map(r => r.data));
  }

  activar(id: number): Observable<ICampana> {
    return this.http.put<{ data: ICampana }>(`${this.url}/${id}/activar`, {}).pipe(map(r => r.data));
  }

  apagar(id: number): Observable<ICampana> {
    return this.http.put<{ data: ICampana }>(`${this.url}/${id}/apagar`, {}).pipe(map(r => r.data));
  }

  duplicar(id: number): Observable<ICampana> {
    return this.http.post<{ data: ICampana }>(`${this.url}/${id}/duplicar`, {}).pipe(map(r => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete(`${this.url}/${id}`).pipe(map(() => void 0));
  }

  /** El botón «Verificar» de Venta directa: ¿este código es de este cliente y cuánto lleva? Si falla (429 de intentos) deja pasar el error. */
  verificarCodigo(codigo: string, correo: string | null, telefono: string | null): Observable<IVerificacionCodigo> {
    return this.http.post<{ data: IVerificacionCodigo }>(`${this.url}/personas/verificar`, { codigo, correo, telefono }).pipe(map(r => r.data));
  }

  /** Lo que lleva pagado un cliente reconocido SIN código (correo, teléfono o cliente): para el aviso en vivo de Venta directa. */
  acumuladoDelCliente(d: { correo: string | null; telefono: string | null; clienteId: number | null; clienteSinRegistroId: number | null }): Observable<IVerificacionCodigo> {
    return this.http.post<{ data: IVerificacionCodigo }>(`${this.url}/personas/acumulado`, d).pipe(map(r => r.data));
  }

  /** Escanear el QR: ¿de quién es este código? Con eso se llenan los datos del cliente de la venta. 429 si se hacen demasiados intentos. */
  buscarPorCodigo(codigo: string): Observable<IBuscarPorCodigo> {
    return this.http.post<{ data: IBuscarPorCodigo }>(`${this.url}/personas/buscar-por-codigo`, { codigo }).pipe(map(r => r.data));
  }

  /** «Eliminar datos de esta persona» (solo administrador). */
  eliminarPersona(id: number): Observable<void> {
    return this.http.delete(`${this.url}/personas/${id}`).pipe(map(() => void 0));
  }

  /** Quién lleva cuánto en la campaña y quién ya llegó a la meta. */
  reporte(id: number): Observable<IReporteCampana> {
    return this.http.get<{ data: IReporteCampana }>(`${this.url}/${id}/reporte`).pipe(map(r => r.data));
  }

  /** Vuelve a mandar por correo el código de la persona de este pedido (botón de Mis pedidos). */
  reenviarCodigo(pedidoId: number): Observable<void> {
    return this.http.post(`${this.url}/pedidos/${pedidoId}/enviar-codigo`, {}).pipe(map(() => void 0));
  }
}
