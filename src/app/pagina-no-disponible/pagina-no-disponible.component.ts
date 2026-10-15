import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SeoService } from '../shared/seo/seo.service';

/** La dirección que el servidor contesta con un 404 de verdad (ver default.conf). */
export const RUTA_NO_ENCONTRADA = '/no-encontrada';

@Component({
  selector: 'app-pagina-no-disponible',
  templateUrl: './pagina-no-disponible.component.html',
  styleUrls: ['./pagina-no-disponible.component.scss']
})
export class PaginaNoDisponibleComponent implements OnInit, OnDestroy {

  /** true si la app arrancó en esta página (se escribió o pegó la dirección, o vino de Google). */
  private readonly primeraCarga: boolean;

  constructor(private readonly seo: SeoService,
              private readonly title: Title,
              private readonly router: Router,
              private readonly location: Location,
              @Inject(DOCUMENT) private readonly doc: Document) {
    this.primeraCarga = !this.router.getCurrentNavigation()?.previousNavigation;
  }

  ngOnInit(): void {
    // Una app de una sola página: el servidor contesta 200 a cualquier dirección y Google guardaría
    // esta página como contenido de la tienda ("soft 404"). Dos arreglos, los que pide Google:
    // 1) noindex, y 2) si se entró directo a una dirección que no existe, se recarga en
    //    /no-encontrada, que el servidor contesta con 404 de verdad.
    this.seo.noIndexar();
    this.title.setTitle('Página no encontrada — Novedades Jade');
    if (this.primeraCarga && this.doc.location.pathname !== RUTA_NO_ENCONTRADA) {
      this.doc.location.replace(RUTA_NO_ENCONTRADA);
    }
  }

  ngOnDestroy(): void {
    this.seo.restablecer();
  }

  regresar(): void {
    if (this.doc.defaultView && this.doc.defaultView.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/tienda/buscar');
    }
  }
}
