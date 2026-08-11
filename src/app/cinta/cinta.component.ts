import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ICintaItem } from './models/cinta.model';
import { CintaService } from './service/cinta.service';

/**
 * Cinta de promociones que corre de derecha a izquierda arriba del contenido.
 *
 * Rutas donde NO se muestra: las de autenticación y la política de privacidad. Son pantallas
 * a página completa con su propio diseño (el login incluso pinta su malla WebGL); meterles una
 * cinta comercial encima se ve fuera de lugar.
 */
const RUTAS_OCULTAS = ['/login', '/usuarios/registrar', '/privacidad', '/verificar-correo', '/olvide-password'];

@Component({
  selector: 'app-cinta',
  templateUrl: './cinta.component.html',
  styleUrls: ['./cinta.component.scss']
})
export class CintaComponent implements OnInit, OnDestroy {

  items: ICintaItem[] = [];
  visible = true;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly cinta: CintaService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.cinta.activos$.pipe(takeUntil(this.destroy$)).subscribe(items => this.items = items);

    this.evaluarRuta(this.router.url);
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(e => this.evaluarRuta((e as NavigationEnd).urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * La duración crece con la cantidad de frases para que la velocidad de lectura sea
   * la misma con 3 o con 15 — si fuera fija, más frases significarían texto más veloz.
   */
  get duracion(): string {
    return `${Math.max(18, this.items.length * 6)}s`;
  }

  private evaluarRuta(url: string): void {
    const limpia = url.split('?')[0];
    this.visible = !RUTAS_OCULTAS.some(r => limpia === r || limpia.startsWith(r + '/'));
  }
}
