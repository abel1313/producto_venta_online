import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IConfigurarRifa,
  IConfigurarRifaVariante,
  IConfigurarRifaVarianteRequest
} from '../models/configurar-rifa.model';
import {
  IConcursante,
  IClientePedido,
  IImportarDePedidosRequest
} from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa } from '../models/estado-rifa.model';
import { IVarianteResumenPaginable } from 'src/app/variante/models/variante.model';

export type ModoContinuacion = 'RESTANTES' | 'CERO' | 'NUEVOS';

@Injectable({ providedIn: 'root' })
export class RifaService {
  private readonly url = environment.api_Url;

  constructor(private readonly http: HttpClient) {}

  // ── 1. Buscar variante ─────────────────────────────────────────────
  buscarVariante(termino: string, pagina = 1, size = 10): Observable<IVarianteResumenPaginable> {
    return this.http.get<{ code: number; data: IVarianteResumenPaginable }>(
      `${this.url}/variantes/buscar?termino=${encodeURIComponent(termino)}&pagina=${pagina}&size=${size}`
    ).pipe(map(r => r.data));
  }

  // ── 2. Crear sesión de rifa ────────────────────────────────────────
  configurarRifa(data: { fechaHoraLimite: string; activa: boolean }): Observable<IConfigurarRifa> {
    return this.http.post<{ code: number; data: IConfigurarRifa }>(
      `${this.url}/configurarRifa/save`, data
    ).pipe(map(r => r.data));
  }

  // ── 3. Agregar variante a la rifa ──────────────────────────────────
  guardarVarianteRifa(data: IConfigurarRifaVarianteRequest): Observable<IConfigurarRifaVariante> {
    return this.http.post<{ code: number; data: IConfigurarRifaVariante }>(
      `${this.url}/configurarRifaVariante/save`, data
    ).pipe(map(r => r.data));
  }

  // ── 4. Listar variantes de la rifa ─────────────────────────────────
  getVariantesRifa(rifaId: number): Observable<IConfigurarRifaVariante[]> {
    return this.http.get<{ code: number; data: IConfigurarRifaVariante[] }>(
      `${this.url}/configurarRifaVariante/porRifa/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 5. Palabras clave disponibles ──────────────────────────────────
  getPalabrasClave(rifaId: number): Observable<string[]> {
    return this.http.get<{ code: number; data: string[] }>(
      `${this.url}/configurarRifaVariante/palabrasClave/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 6. Eliminar variante de la rifa ────────────────────────────────
  eliminarVarianteRifa(id: number): Observable<string> {
    return this.http.delete<{ code: number; data: string }>(
      `${this.url}/configurarRifaVariante/${id}`
    ).pipe(map(r => r.data));
  }

  // ── 7. Actualizar palabraClave ─────────────────────────────────────
  actualizarPalabraClave(id: number, palabraClave: string): Observable<IConfigurarRifaVariante> {
    return this.http.put<{ code: number; data: IConfigurarRifaVariante }>(
      `${this.url}/configurarRifaVariante/${id}/palabraClave`, { palabraClave }
    ).pipe(map(r => r.data));
  }

  // ── 8. Agregar participante ────────────────────────────────────────
  registrarConcursante(data: IConcursante): Observable<IConcursante> {
    return this.http.post<{ code: number; data: IConcursante }>(
      `${this.url}/concursante/registrar`, data
    ).pipe(map(r => r.data));
  }

  eliminarConcursante(id: number): Observable<any> {
    return this.http.delete(`${this.url}/concursante/delete`, { body: id });
  }

  getConcursantesPorRifa(rifaId: number): Observable<IConcursante[]> {
    return this.http.get<{ lista: IConcursante[] }>(
      `${this.url}/concursante/porRifa/${rifaId}`
    ).pipe(map(r => r.lista ?? []));
  }

  getElegibles(rifaId: number): Observable<IConcursante[]> {
    return this.http.get<{ code: number; data: IConcursante[] }>(
      `${this.url}/concursante/elegibles/${rifaId}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 9. Clientes del mes ────────────────────────────────────────────
  getClientesPorMes(mes: string): Observable<IClientePedido[]> {
    return this.http.get<{ code: number; data: IClientePedido[] }>(
      `${this.url}/concursante/clientesPorMes?mes=${mes}`
    ).pipe(map(r => r.data ?? []));
  }

  // ── 10. Importar desde pedidos ─────────────────────────────────────
  importarDePedidos(data: IImportarDePedidosRequest): Observable<IConcursante[]> {
    return this.http.post<{ code: number; data: IConcursante[] }>(
      `${this.url}/concursante/importarDePedidos`, data
    ).pipe(map(r => r.data ?? []));
  }

  // ── 11. Estado del sorteo ──────────────────────────────────────────
  getEstado(rifaId: number): Observable<IEstadoRifa> {
    return this.http.get<{ code: number; data: IEstadoRifa }>(
      `${this.url}/ganadorRifa/estado/${rifaId}`
    ).pipe(map(r => r.data));
  }

  // ── 12. Girar la ruleta ────────────────────────────────────────────
  sortear(rifaId: number): Observable<IGanadorRifa> {
    return this.http.post<{ code: number; data: IGanadorRifa }>(
      `${this.url}/ganadorRifa/sortear/${rifaId}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 13. Continuar a la siguiente variante ──────────────────────────
  continuarVariante(rifaId: number, modo: ModoContinuacion): Observable<IEstadoRifa> {
    return this.http.post<{ code: number; data: IEstadoRifa }>(
      `${this.url}/ganadorRifa/continuarVariante/${rifaId}?modo=${modo}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 14. Reiniciar ──────────────────────────────────────────────────
  reiniciar(rifaId: number, completo = false): Observable<string> {
    return this.http.post<{ code: number; data: string }>(
      `${this.url}/ganadorRifa/reiniciar/${rifaId}?completo=${completo}`, {}
    ).pipe(map(r => r.data));
  }

  // ── 15. Rifas activas ──────────────────────────────────────────────
  getConfiguracionesActivas(): Observable<IConfigurarRifa[]> {
    return this.http.get<{ code: number; data: IConfigurarRifa[] }>(
      `${this.url}/configurarRifa/activas`
    ).pipe(map(r => r.data ?? []));
  }

  getConfiguracionesHoy(): Observable<IConfigurarRifa[]> {
    return this.http.get<{ code: number; data: IConfigurarRifa[] }>(
      `${this.url}/configurarRifa/activas/hoy`
    ).pipe(map(r => r.data ?? []));
  }
}
