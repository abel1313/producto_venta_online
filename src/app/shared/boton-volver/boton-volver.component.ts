import { Component, HostBinding, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Botón "Volver" homologado — mismo estilo/posición en todas las pantallas de detalle/edición
 * (pedido 2026-08-28: cada pantalla lo tenía distinto: unas en la esquina, otras alineado al
 * contenido; ninguna quedaba visible al hacer scroll, y todas volvían a una ruta fija en vez de
 * a la pantalla real de la que venía el usuario — con filtros incluidos, porque las pantallas de
 * búsqueda reflejan sus filtros en la URL).
 *
 * Usa `Location.back()` (historial real del navegador) en vez de una ruta fija, así siempre
 * vuelve a donde estaba el usuario -- incluida la pantalla de búsqueda con los mismos filtros
 * seleccionados. `fallback` solo se usa si no hay una pantalla anterior real en este historial
 * (ej. se entró por URL directa).
 */
@Component({
  selector: 'app-boton-volver',
  templateUrl: './boton-volver.component.html',
  styleUrls: ['./boton-volver.component.scss']
})
export class BotonVolverComponent {
  @Input() etiqueta = 'Volver';
  @Input() fallback: string = '/tienda/buscar';

  /**
   * Alinear el botón con el borde izquierdo del contenido (como en Privacidad): `anchoContenido` es
   * el max-width de la tarjeta centrada de la pantalla y `margen` el padding lateral de su página.
   * Sin ellos el botón queda pegado al borde de la página, que es lo correcto cuando el contenido
   * ocupa todo el ancho.
   */
  @Input() anchoContenido: string | null = null;
  @Input() margen: string | null = null;

  @HostBinding('style.max-width') get anchoMaximo(): string | null {
    return this.anchoContenido ? `calc(${this.anchoContenido} + 2 * ${this.margen ?? '0px'})` : null;
  }
  @HostBinding('style.padding-inline') get paddingLateral(): string | null { return this.margen; }
  @HostBinding('style.margin-inline') get centrado(): string | null { return this.anchoContenido ? 'auto' : null; }
  @HostBinding('style.box-sizing') readonly cajaBorde = 'border-box';

  constructor(private readonly location: Location, private readonly router: Router) {}

  volver(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.fallback);
    }
  }
}
