import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { IHashtagsDefault, PlataformaRed } from 'src/app/redes-sociales/models/publicacion.model';
import { RedesSocialesService } from 'src/app/redes-sociales/service/redes-sociales.service';

/**
 * Alta de los hashtags fijos de cada red.
 *
 * ⚠️ **Existe porque el dueño preguntó DOS veces dónde se daban de alta**, teniendo el recuadro
 * enfrente dentro de la pantalla de publicar. La primera vez se le puso título y estado visible;
 * como volvió a preguntar, se hizo la pantalla propia — su modelo mental es "los registro en un
 * lado y la de publicar los toma", no "los guardo mientras publico".
 *
 * Los dos caminos conviven a propósito: aquí se dan de alta, y en publicar se siguen pudiendo
 * ajustar para un post puntual sin salir de la publicación.
 */
@Component({
  selector: 'app-gestion-hashtags',
  templateUrl: './gestion-hashtags.component.html',
  styleUrls: ['./gestion-hashtags.component.scss']
})
export class GestionHashtagsComponent implements OnInit, OnDestroy {

  readonly TODAS: PlataformaRed[] = ['facebook', 'instagram', 'tiktok'];

  /** Lo que está escrito en cada campo (editable). */
  texto: Record<PlataformaRed, string> = { facebook: '', instagram: '', tiktok: '' };
  /** Lo que de verdad está guardado en el servidor — para saber si hay cambios sin guardar. */
  guardado: Record<PlataformaRed, string> = { facebook: '', instagram: '', tiktok: '' };

  cargando = true;
  /** Cuál se está guardando: bloquea solo esa red, no la pantalla entera. */
  guardando: PlataformaRed | null = null;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private readonly redes: RedesSocialesService) {}

  ngOnInit(): void { this.cargar(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.redes.hashtagsDefault().pipe(takeUntil(this.destroy$)).subscribe({
      next: filas => {
        filas.forEach(f => {
          const red = f.redSocial as PlataformaRed;
          if (!this.TODAS.includes(red)) return;
          this.texto[red] = f.hashtags ?? '';
          this.guardado[red] = f.hashtags ?? '';
        });
        this.cargando = false;
      },
      // Aquí el error SÍ se muestra (a diferencia de la pantalla de publicar, donde es accesorio):
      // esta pantalla no sirve para nada más, si no cargó no hay nada que hacer sin saber por qué.
      error: err => {
        this.cargando = false;
        this.error = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudieron cargar los hashtags.';
      }
    });
  }

  nombreDeRed(r: PlataformaRed): string {
    return r === 'facebook' ? '📘 Facebook' : r === 'instagram' ? '📸 Instagram' : '🎵 TikTok';
  }

  sinCambios(r: PlataformaRed): boolean {
    return (this.texto[r] || '').trim() === (this.guardado[r] || '').trim();
  }

  /** El PUT reemplaza el texto completo, así que esto cubre agregar, corregir y borrar. */
  guardar(r: PlataformaRed): void {
    if (this.guardando || this.sinCambios(r)) return;
    this.guardando = r;

    const texto = (this.texto[r] || '').trim();
    this.redes.guardarHashtagsDefault(r, texto).pipe(takeUntil(this.destroy$)).subscribe({
      next: fila => {
        this.guardado[r] = fila?.hashtags ?? texto;
        this.texto[r] = this.guardado[r];
        this.guardando = null;
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: texto
            ? `Los hashtags de ${this.nombreDeRed(r)} se van a poner solos al publicar.`
            : `${this.nombreDeRed(r)} se quedó sin hashtags guardados.`
        });
      },
      error: err => {
        this.guardando = null;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar',
          text: err?.error?.mensaje ?? err?.error?.message ?? 'Intenta de nuevo.'
        });
      }
    });
  }

  deshacer(r: PlataformaRed): void { this.texto[r] = this.guardado[r]; }

  /** Cuántos hashtags hay escritos — para que se vea de un vistazo si quedó algo raro. */
  cuantos(r: PlataformaRed): number {
    return (this.texto[r] || '').split(/\s+/).filter(p => p.trim() !== '').length;
  }
}
