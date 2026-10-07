import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../shared/seo/seo.service';

@Component({
  selector: 'app-pagina-no-disponible',
  templateUrl: './pagina-no-disponible.component.html',
  styleUrls: ['./pagina-no-disponible.component.scss']
})
export class PaginaNoDisponibleComponent implements OnInit, OnDestroy {

  constructor(private readonly seo: SeoService) { }

  ngOnInit(): void {
    // El servidor contesta 200 a cualquier ruta (app de una sola página): sin esto Google
    // guardaría esta página como si fuera contenido de la tienda.
    this.seo.noIndexar();
  }

  ngOnDestroy(): void {
    this.seo.restablecer();
  }
}
