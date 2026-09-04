import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ITemaVariable } from '../models/tema.model';
import { TemaService } from '../../services/tema/tema.service';

// Envoltorio delgado sobre el TemaService global (providedIn: 'root', el mismo que aplica el
// tema en vivo desde app.component.ts) -- mismo patrón de carpetas que menu-admin
// (models/ + service/ + gestion/), pero sin duplicar la lógica de CRUD/preview, que ya vive
// en un solo lugar (services/tema) para que la pantalla de Personalización y el resto de la app
// vean siempre el mismo estado.
@Injectable({ providedIn: 'root' })
export class TemaAdminService {

  constructor(private readonly tema: TemaService) {}

  listar(): Observable<ITemaVariable[]> {
    return this.tema.getAll();
  }

  crear(v: ITemaVariable): Observable<ITemaVariable> {
    return this.tema.crear(v);
  }

  actualizar(id: number, v: ITemaVariable): Observable<ITemaVariable> {
    return this.tema.actualizar(id, v);
  }

  eliminar(id: number): Observable<void> {
    return this.tema.eliminar(id);
  }

  /** Preview instantáneo mientras el admin edita, antes de guardar. */
  previsualizar(variables: ITemaVariable[]): void {
    this.tema.previsualizar(variables);
  }

  /** Recarga el catálogo desde el server y lo vuelve a aplicar -- usar tras guardar/eliminar. */
  recargarYAplicar(): void {
    this.tema.getActivo().subscribe({ next: variables => this.tema.previsualizar(variables) });
  }
}
