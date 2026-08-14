import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IConfigEntrega, IConfigEntregaRequest } from '../models/config-entrega.model';

/**
 * ⚠️ **ENDPOINTS PROVISIONALES — el back todavía no los construyó.**
 *
 * Se dejan escritos con la forma que se le propuso (mismo patrón de CRUD genérico que el resto
 * del módulo) para que la pantalla se pueda armar y el dueño la valide antes de que nadie
 * construya la tabla. **Mientras no existan, la pantalla va a mostrar su aviso de error al
 * cargar** — es lo esperado, no un bug.
 *
 * Cuando el back defina el modelo real, lo único que debería cambiar es este archivo. Si deciden
 * colgarlo de `CantidadFlorValida` en vez de una tabla aparte, esto se borra y las llamadas se
 * hacen desde `FloresService` con los campos extra.
 *
 * Deliberadamente NO se guarda nada en `localStorage` como respaldo: ya se cometió ese error con
 * la cinta de promociones y terminó en datos que solo existían en un navegador.
 */
@Injectable({ providedIn: 'root' })
export class ConfigEntregaService {

  private readonly url = `${environment.api_Url}/v1/config-entrega`;

  constructor(private readonly http: HttpClient) {}

  getAll(page = 0, size = 200): Observable<IConfigEntrega[]> {
    return this.http
      .get<{ data: IConfigEntrega[]; lista: IConfigEntrega[] }>(`${this.url}/getAll?page=${page}&size=${size}`)
      // Se leen los dos campos: en este módulo ya hubo un endpoint que devolvía el arreglo en
      // `lista` y no en `data` (`colores-flor/por-tipo-flor`), y costó tiempo encontrarlo.
      .pipe(map(r => r?.data ?? r?.lista ?? []));
  }

  save(body: IConfigEntregaRequest): Observable<IConfigEntrega> {
    return this.http.post<{ data: IConfigEntrega }>(`${this.url}/save`, body).pipe(map(r => r.data));
  }

  update(body: IConfigEntregaRequest): Observable<IConfigEntrega> {
    return this.http.put<{ data: IConfigEntrega }>(`${this.url}/update/${body.id}`, body).pipe(map(r => r.data));
  }

  /** El id va como número JSON crudo en el body, igual que el resto de los catálogos. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/delete`, { body: id });
  }
}
