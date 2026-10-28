import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** La casilla de un artículo: `propio` null = hereda la del producto. */
export interface IAceptaMsiArticulo {
  propio: boolean | null;
  heredaDelProducto: boolean;
  delProducto: boolean;
  /** Lo que de verdad cuenta al cobrar (la propia si la hay, si no la del producto). */
  efectivo: boolean;
}

/** Lo que se le muestra al usuario cuando la casilla no se puede guardar (409 = falta la migración en ese ambiente). */
export const AVISO_MSI_NO_DISPONIBLE = 'Los meses sin intereses todavía no están disponibles en este ambiente.';

/**
 * La casilla "Acepta meses sin intereses" de productos y artículos (solo administrador).
 * Contrato: `CAMBIOS_FRONT.md` del back, sección "Casilla Acepta meses sin intereses" (2026-10-28).
 *
 * El producto y el artículo NO traen este dato en lo que ya guardan o consultan: se lee y se cambia solo aquí.
 * Si el back responde 404 o 409 (otro ambiente sin la migración), las lecturas devuelven `null` y la pantalla
 * oculta la casilla en vez de romperse.
 */
@Injectable({ providedIn: 'root' })
export class AceptaMsiService {

  private readonly url = `${environment.api_Url}/v1/acepta-msi`;

  constructor(private readonly http: HttpClient) {}

  /** null = no disponible (ambiente sin migración, sin permiso o producto inexistente). */
  producto(productoId: number): Observable<boolean | null> {
    return this.http.get<{ data: { aceptaMsi: boolean } }>(`${this.url}/producto/${productoId}`).pipe(
      map(r => !!r?.data?.aceptaMsi),
      catchError(() => of(null))
    );
  }

  cambiarProducto(productoId: number, aceptaMsi: boolean): Observable<boolean> {
    return this.http.put<{ data: { aceptaMsi: boolean } }>(`${this.url}/producto/${productoId}`, { aceptaMsi })
      .pipe(map(r => !!r?.data?.aceptaMsi));
  }

  /** null = no disponible. */
  articulo(varianteId: number): Observable<IAceptaMsiArticulo | null> {
    return this.http.get<{ data: IAceptaMsiArticulo }>(`${this.url}/articulo/${varianteId}`).pipe(
      map(r => r?.data ?? null),
      catchError(() => of(null))
    );
  }

  /** @param aceptaMsi null = que el artículo vuelva a heredar la casilla de su producto */
  cambiarArticulo(varianteId: number, aceptaMsi: boolean | null): Observable<IAceptaMsiArticulo> {
    return this.http.put<{ data: IAceptaMsiArticulo }>(`${this.url}/articulo/${varianteId}`, { aceptaMsi })
      .pipe(map(r => r.data));
  }

  /** Valor efectivo (con herencia) de varios artículos a la vez, para pintar el chip «MSI». Vacío si no está disponible. */
  efectivos(varianteIds: number[]): Observable<Record<number, boolean>> {
    if (!varianteIds.length) return of({});
    const params = new HttpParams().set('ids', varianteIds.join(','));
    return this.http.get<{ data: Record<number, boolean> }>(`${this.url}/articulos`, { params }).pipe(
      map(r => r?.data ?? {}),
      catchError(() => of({}))
    );
  }

  /** Texto para mostrar cuando un PUT falla (409 = falta la migración; otro = error general). */
  static mensajeDeError(err: any): string {
    if (err?.status === 409) return AVISO_MSI_NO_DISPONIBLE;
    return err?.error?.mensaje ?? 'No se pudo guardar la casilla de meses sin intereses.';
  }
}
