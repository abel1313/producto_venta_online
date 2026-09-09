import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IConfigurarRifa,
  IConfigurarRifaRequest,
  IConfigurarRifaVariante,
  IConfigurarRifaVarianteRequest,
  TipoRifa
} from '../models/configurar-rifa.model';
import {
  IConcursante,
  IClientePedido,
  IImportarDePedidosRequest,
  IImportarDePedidosResponse
} from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa } from '../models/estado-rifa.model';
import { IVarianteResumenPaginable } from 'src/app/variante/models/variante.model';
import {
  IBoletoRifa,
  IBoletoRifaRequest,
  IEstadoRifaPlataformas,
  IPremioPublico,
  IResultadoSorteoPlataformas
} from '../models/boleto-rifa.model';

export type ModoContinuacion = 'RESTANTES' | 'CERO' | 'NUEVOS';

@Injectable({ providedIn: 'root' })
export class RifaService {
  private readonly url = environment.api_Url;

  constructor(private readonly http: HttpClient) {}

  // ── 1. Buscar variante ─────────────────────────────────────────────
  // ⚠️ Ver nota de renombrado /variantes → /tienda en variante.service.ts — mismo criterio.
  /**
   * Busca variantes para elegir un PREMIO de la rifa.
   *
   * Va contra `/buscar-filtrado` y no contra `/buscar` a propósito: un premio no se puede
   * rifar si no hay pieza que entregar, si está deshabilitada o si no tiene foto que
   * enseñar en la ruleta. Esa query del back ya exige las tres cosas (stock > 0,
   * producto y variante habilitados, y que exista imagen), así que el filtro se hace del
   * lado del server y la paginación de 10 en 10 sigue cuadrando -- filtrarlo aquí dejaría
   * páginas medio vacías o vacías del todo.
   */
  buscarVariante(termino: string, pagina = 1, size = 10): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ code: number; data: IVarianteResumenPaginable }>(
      `${this.url}/tienda/v1/buscar-filtrado?termino=${encodeURIComponent(termino)}&pagina=${pagina}&size=${size}`
    ).pipe(map(r => r.data));
  }

  // ── 2. Crear sesión de rifa ────────────────────────────────────────
  configurarRifa(data: IConfigurarRifaRequest): Observable<IConfigurarRifa> {
    return this.http.post<{ code: number; data: IConfigurarRifa }>(
      `${this.url}/v1/configurarRifa/save`, data
    ).pipe(map(r => r.data));
  }

  // ── 2b. Actualizar configuración (fecha, tipo, mesReferencia, rango de boletos) ──
  actualizarConfiguracion(id: number, patch: {
    fechaHoraLimite?: string;
    tipo?: TipoRifa;
    mesReferencia?: string | null;
    fechaInicioBoletos?: string | null;
    fechaFinBoletos?: string | null;
  }): Observable<IConfigurarRifa> {
    return this.http.put<{ code: number; data: IConfigurarRifa }>(
      `${this.url}/v1/configurarRifa/${id}`, patch
    ).pipe(map(r => r.data));
  }

  // ── 2c. Activar/desactivar modo prueba ─────────────────────────────
  // Marca cuál es la rifa que abre el link público. Publicar una despublica la anterior.
  setPublica(rifaId: number, publica: boolean): Observable<IConfigurarRifa> {
    return this.http.put<{ code: number; data: IConfigurarRifa }>(
      `${this.url}/v1/configurarRifa/${rifaId}/publica`, { publica }
    ).pipe(map(r => r.data));
  }

  setEsPrueba(rifaId: number, esPrueba: boolean): Observable<IConfigurarRifa> {
    return this.http.put<{ code: number; data: IConfigurarRifa }>(
      `${this.url}/v1/configurarRifa/${rifaId}/esPrueba`, { esPrueba }
    ).pipe(map(r => r.data));
  }

  // ── 2c. Buscar rifas por tipo/mes/rango de fechas ──────────────────
  buscarConfiguraciones(params: { tipo?: TipoRifa; mesReferencia?: string; desde?: string; hasta?: string }): Observable<IConfigurarRifa[]> {
    const query = new URLSearchParams();
    if (params.tipo) query.set('tipo', params.tipo);
    if (params.mesReferencia) query.set('mesReferencia', params.mesReferencia);
    if (params.desde) query.set('desde', params.desde);
    if (params.hasta) query.set('hasta', params.hasta);
    return this.http.get<{ code: number; data: IConfigurarRifa[] }>(
      `${this.url}/v1/configurarRifa/buscar?${query.toString()}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 3. Agregar variante a la rifa ──────────────────────────────────
  guardarVarianteRifa(data: IConfigurarRifaVarianteRequest): Observable<IConfigurarRifaVariante> {
    return this.http.post<{ code: number; data: IConfigurarRifaVariante }>(
      `${this.url}/v1/configurarRifaVariante/save`, data
    ).pipe(map(r => r.data));
  }

  // ── 4. Listar variantes de la rifa ─────────────────────────────────
  getVariantesRifa(rifaId: number): Observable<IConfigurarRifaVariante[]> {
    return this.http.get<{ code: number; data: IConfigurarRifaVariante[] }>(
      `${this.url}/v1/configurarRifaVariante/porRifa/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 5. Palabras clave disponibles ──────────────────────────────────
  getPalabrasClave(rifaId: number): Observable<string[]> {
    return this.http.get<{ code: number; data: string[] }>(
      `${this.url}/v1/configurarRifaVariante/palabrasClave/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 6. Eliminar variante de la rifa ────────────────────────────────
  eliminarVarianteRifa(id: number): Observable<string> {
    return this.http.delete<{ code: number; data: string }>(
      `${this.url}/v1/configurarRifaVariante/${id}`
    ).pipe(map(r => r.data));
  }

  // ── 6b. Editar un premio ya guardado ───────────────────────────────
  // Antes solo se podía cambiar la palabraClave, así que corregir "¿en qué giro gana?"
  // obligaba a eliminar el premio y volverlo a crear (devolviendo y re-reservando stock).
  editarVarianteRifa(id: number, patch: {
    giroGanador?: number;
    orden?: number;
    permitirNuevos?: boolean;
    palabraClave?: string;
    varianteId?: number;
  }): Observable<IConfigurarRifaVariante> {
    return this.http.put<{ code: number; data: IConfigurarRifaVariante }>(
      `${this.url}/v1/configurarRifaVariante/${id}`, patch
    ).pipe(map(r => r.data));
  }

  // ── 7. Actualizar palabraClave ─────────────────────────────────────
  actualizarPalabraClave(id: number, palabraClave: string): Observable<IConfigurarRifaVariante> {
    return this.http.put<{ code: number; data: IConfigurarRifaVariante }>(
      `${this.url}/v1/configurarRifaVariante/${id}/palabraClave`, { palabraClave }
    ).pipe(map(r => r.data));
  }

  // ── 8. Agregar participante ────────────────────────────────────────
  registrarConcursante(data: IConcursante): Observable<IConcursante> {
    return this.http.post<{ code: number; data: IConcursante }>(
      `${this.url}/v1/concursante/registrar`, data
    ).pipe(map(r => r.data));
  }

  eliminarConcursante(id: number): Observable<any> {
    return this.http.delete(`${this.url}/v1/concursante/${id}`);
  }

  // ── 8b. Editar participante (campos parciales) ─────────────────────
  actualizarConcursante(id: number, data: Partial<IConcursante>): Observable<IConcursante> {
    return this.http.put<{ code: number; data: IConcursante }>(
      `${this.url}/v1/concursante/${id}`, data
    ).pipe(map(r => r.data));
  }

  getConcursantesPorRifa(rifaId: number): Observable<IConcursante[]> {
    return this.http.get<{ data: IConcursante[] }>(
      `${this.url}/v1/concursante/porRifa/${rifaId}`
    ).pipe(map(r => r.data ?? []));
  }

  getElegibles(rifaId: number): Observable<IConcursante[]> {
    return this.http.get<{ code: number; data: IConcursante[] }>(
      `${this.url}/v1/concursante/elegibles/${rifaId}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 9. Clientes del mes ────────────────────────────────────────────
  getClientesPorMes(mes: string): Observable<IClientePedido[]> {
    return this.http.get<{ code: number; data: IClientePedido[] }>(
      `${this.url}/v1/concursante/clientesPorMes?mes=${mes}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 10. Importar desde pedidos ─────────────────────────────────────
  importarDePedidos(data: IImportarDePedidosRequest): Observable<IImportarDePedidosResponse> {
    return this.http.post<{ code: number; data: IImportarDePedidosResponse }>(
      `${this.url}/v1/concursante/importarDePedidos`, data
    ).pipe(map(r => r.data ?? { importados: [], omitidosYaRegistrados: [], omitidosSinNombre: [] }));
  }

  // ── 11. Estado del sorteo ──────────────────────────────────────────
  getEstado(rifaId: number): Observable<IEstadoRifa> {
    return this.http.get<{ code: number; data: IEstadoRifa }>(
      `${this.url}/v1/ganadorRifa/estado/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 12. Girar la ruleta ────────────────────────────────────────────
  sortear(rifaId: number): Observable<IGanadorRifa> {
    return this.http.post<{ code: number; data: IGanadorRifa }>(
      `${this.url}/v1/ganadorRifa/sortear/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 13. Continuar a la siguiente variante ──────────────────────────
  continuarVariante(rifaId: number, modo: ModoContinuacion): Observable<IEstadoRifa> {
    return this.http.post<{ code: number; data: IEstadoRifa }>(
      `${this.url}/v1/ganadorRifa/continuarVariante/${rifaId}?modo=${modo}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 14. Reiniciar ──────────────────────────────────────────────────
  reiniciar(rifaId: number, completo = false): Observable<string> {
    return this.http.post<{ code: number; data: string }>(
      `${this.url}/v1/ganadorRifa/reiniciar/${rifaId}?completo=${completo}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 15b. Copiar concursantes de una rifa origen a una rifa destino ─
  copiarDeRifa(data: { rifaOrigenId: number; rifaDestinoId: number; palabraClave: string }): Observable<IConcursante[]> {
    return this.http.post<{ code: number; data: IConcursante[] }>(
      `${this.url}/v1/concursante/copiarDeRifa`, data
    ).pipe(map(r => r.data ?? []));
  }

  // ── 15. Rifas activas ──────────────────────────────────────────────
  getConfiguracionesActivas(): Observable<IConfigurarRifa[]> {
    return this.http.get<{ code: number; data: IConfigurarRifa[] }>(
      `${this.url}/v1/configurarRifa/activas`
    ).pipe(map(r => r.data ?? []));
  }

  getConfiguracionesHoy(): Observable<IConfigurarRifa[]> {
    return this.http.get<{ code: number; data: IConfigurarRifa[] }>(
      `${this.url}/v1/configurarRifa/activas/hoy`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 16. Boletos por acción en redes sociales ───────────────────────
  registrarBoleto(data: IBoletoRifaRequest): Observable<IBoletoRifa> {
    return this.http.post<{ code: number; data: IBoletoRifa }>(
      `${this.url}/v1/boletoRifa/registrar`, data
    ).pipe(map(r => r.data));
  }

  // Corrige un boleto ya capturado (plataforma, fecha, URLs) sin borrarlo: eliminarlo
  // descuenta el boleto del participante y volver a capturarlo lo vuelve a sumar.
  editarBoleto(id: number, data: IBoletoRifaRequest): Observable<IBoletoRifa> {
    return this.http.put<{ code: number; data: IBoletoRifa }>(
      `${this.url}/v1/boletoRifa/${id}`, data
    ).pipe(map(r => r.data));
  }

  getBoletosPorConcursante(concursanteId: number): Observable<IBoletoRifa[]> {
    return this.http.get<{ code: number; data: IBoletoRifa[] }>(
      `${this.url}/v1/boletoRifa/porConcursante/${concursanteId}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 17. Sorteo de rifa PLATAFORMAS (se sortea entre boletos) ───────
  getEstadoPlataformas(rifaId: number): Observable<IEstadoRifaPlataformas> {
    return this.http.get<{ code: number; data: IEstadoRifaPlataformas }>(
      `${this.url}/v1/boletoRifa/estado/${rifaId}`
    ).pipe(map(r => r.data));
  }

  sortearPlataformas(rifaId: number): Observable<IResultadoSorteoPlataformas> {
    return this.http.post<{ code: number; data: IResultadoSorteoPlataformas }>(
      `${this.url}/v1/boletoRifa/sortear/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  reiniciarPlataformas(rifaId: number): Observable<string> {
    return this.http.post<{ code: number; data: string }>(
      `${this.url}/v1/boletoRifa/reiniciar/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 18. Vista pública de la ruleta (sin sesión) ────────────────────
  // Devuelve lo mismo pero recortado: sin URLs de evidencia ni ganadores.
  getEstadoPublicoPlataformas(rifaId: number): Observable<IEstadoRifaPlataformas> {
    return this.http.get<{ code: number; data: IEstadoRifaPlataformas }>(
      `${this.url}/v1/boletoRifa/publico/estado/${rifaId}`
    ).pipe(map(r => r.data));
  }

  sortearPublicoPlataformas(rifaId: number): Observable<IResultadoSorteoPlataformas> {
    return this.http.post<{ code: number; data: IResultadoSorteoPlataformas }>(
      `${this.url}/v1/boletoRifa/publico/sortear/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  reiniciarPublicoPlataformas(rifaId: number): Observable<string> {
    return this.http.post<{ code: number; data: string }>(
      `${this.url}/v1/boletoRifa/publico/reiniciar/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  // Ficha del premio con todas sus fotos. El premio se pide junto con su rifa porque
  // el back comprueba que le pertenezca antes de devolverlo.
  getPremioPublico(rifaId: number, premioId: number): Observable<IPremioPublico> {
    return this.http.get<{ code: number; data: IPremioPublico }>(
      `${this.url}/v1/boletoRifa/publico/premio/${rifaId}/${premioId}`
    ).pipe(map(r => r.data));
  }

  eliminarBoleto(id: number): Observable<string> {
    return this.http.delete<{ code: number; data: string }>(
      `${this.url}/v1/boletoRifa/${id}`
    ).pipe(map(r => r.data));
  }
}
