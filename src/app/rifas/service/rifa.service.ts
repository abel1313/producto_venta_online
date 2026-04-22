import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IConfigurarRifa } from '../models/configurar-rifa.model';
import { IConcursante } from '../models/concursante.model';
import { IGanadorRifa } from '../models/ganador-rifa.model';
import { IEstadoRifa } from '../models/estado-rifa.model';

@Injectable({ providedIn: 'root' })
export class RifaService {
  private readonly url = environment.api_Url;

  constructor(private readonly http: HttpClient) {}

  configurarRifa(data: IConfigurarRifa): Observable<{ data: IConfigurarRifa }> {
    return this.http.post<{ data: IConfigurarRifa }>(`${this.url}/configurarRifa/save`, data);
  }

  registrarConcursante(data: IConcursante, forzar = false): Observable<{ data: IConcursante }> {
    const params = forzar ? '?forzar=true' : '';
    return this.http.post<{ data: IConcursante }>(`${this.url}/concursante/registrar${params}`, data);
  }

  getConcursantesPorRifa(rifaId: number): Observable<{ lista: IConcursante[] }> {
    return this.http.get<{ lista: IConcursante[] }>(`${this.url}/concursante/porRifa/${rifaId}`);
  }

  getElegibles(rifaId: number): Observable<{ data: IConcursante[] }> {
    return this.http.get<{ data: IConcursante[] }>(`${this.url}/concursante/elegibles/${rifaId}`);
  }

  eliminarConcursante(id: number): Observable<any> {
    return this.http.delete(`${this.url}/concursante/delete`, { body: id });
  }

  sortear(rifaId: number, vueltaActual: number, totalVueltas: number): Observable<{ data: IGanadorRifa }> {
    return this.http.post<{ data: IGanadorRifa }>(
      `${this.url}/ganadorRifa/sortear/${rifaId}?vueltaActual=${vueltaActual}&totalVueltas=${totalVueltas}`,
      {}
    );
  }

  getConfiguracionesActivas(): Observable<{ data: IConfigurarRifa[] }> {
    return this.http.get<{ data: IConfigurarRifa[] }>(`${this.url}/configurarRifa/activas`);
  }

  getEstado(rifaId: number): Observable<{ data: IEstadoRifa }> {
    return this.http.get<{ data: IEstadoRifa }>(`${this.url}/ganadorRifa/estado/${rifaId}`);
  }

  reiniciar(rifaId: number, completo = false): Observable<any> {
    const params = completo ? '?completo=true' : '';
    return this.http.post(`${this.url}/ganadorRifa/reiniciar/${rifaId}${params}`, {});
  }
}
