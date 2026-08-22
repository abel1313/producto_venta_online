import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { IVarianteImagenDto } from 'src/app/variante/models/variante.model';
import { VarianteService } from 'src/app/variante/service/variante.service';
import { comprimirImagen } from 'src/app/shared/imagen-comprimir.util';
import { IVarianteSombra } from '../models/flores.model';

/**
 * Fotos de los artículos de flores (colores, accesorios y frases de listón).
 *
 * ⚠️ **No hay endpoints propios de imagen para flores.** Un color o un accesorio no tiene campo
 * de foto: lo que tiene es un **producto interno** (`variante`, ver `IVarianteSombra`), y la foto
 * se guarda ahí, con los mismos endpoints que cualquier producto del catálogo. Este servicio
 * existe para que las pantallas de flores no tengan que saber eso.
 *
 * ⚠️ **Los tipos de flor (la especie) quedan fuera**: no tienen producto interno ni campo de
 * imagen, así que hoy no pueden llevar foto — haría falta que el back lo agregue.
 */
@Injectable({ providedIn: 'root' })
export class FloresImagenService {

  constructor(private readonly varianteService: VarianteService) {}

  /**
   * Fotos guardadas de un artículo. Devuelve `[]` en vez de fallar: una foto es un adorno, no
   * puede tumbar la pantalla de catálogos ni el armado del ramo.
   */
  imagenesDe(varianteId?: number | null): Observable<IVarianteImagenDto[]> {
    if (!varianteId) return of([]);
    return this.varianteService.getImagenesVariante(varianteId).pipe(
      map(imgs => imgs ?? []),
      catchError(() => of([]))
    );
  }

  /** La URL de la primera foto, o `null`. Es lo que se usa para la miniatura. */
  portadaDe(varianteId?: number | null): Observable<string | null> {
    return this.imagenesDe(varianteId).pipe(map(imgs => imgs[0]?.urlImagen ?? null));
  }

  /**
   * Sube una foto al producto interno del artículo.
   *
   * ⚠️ **Se reenvían los campos que la variante ya tenía** (stock, color, descripción…). El
   * endpoint `guardarConImagenes` guarda la variante completa, así que mandar solo
   * `{ id, listImagenes }` la dejaría con el resto en blanco — y en un color de flor ese `stock`
   * **es el inventario real de ese color**, no un dato de adorno.
   */
  subirFoto(variante: IVarianteSombra | undefined | null, archivo: File): Observable<void> {
    if (!variante?.id || !variante?.producto?.id) {
      return throwError(() => new Error(
        'Este artículo todavía no tiene producto interno, así que no se le puede poner foto. ' +
        'Vuelve a guardarlo o pídele al back que lo regenere.'
      ));
    }

    return from(comprimirImagen(archivo)).pipe(
      switchMap(img => this.varianteService.update(variante.id, {
        id:            variante.id,
        productoId:    variante.producto!.id,
        // Se devuelven tal cual para no perderlos en el guardado.
        color:         variante.color ?? undefined,
        descripcion:   variante.descripcion ?? undefined,
        talla:         variante.talla ?? undefined,
        presentacion:  variante.presentacion ?? undefined,
        marca:         variante.marca ?? undefined,
        contenidoNeto: variante.contenidoNeto ?? undefined,
        stock:         variante.stock,
        listImagenes:  [img]
      })),
      map(() => undefined)
    );
  }
}
