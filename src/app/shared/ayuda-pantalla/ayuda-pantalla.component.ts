import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { AyudaPantalla, ayudaDeRuta } from './ayuda-pantallas.catalog';

/**
 * Icono de ayuda con la explicación de la pantalla actual (pedido 2026-09-17).
 *
 * Motivo: pantallas con nombres parecidos ("Agregar Modelo" vs "Nuevo Producto") no dejaban
 * claro cuál usar ni en qué se diferenciaban, y había que entrar a probar para acordarse.
 *
 * Solo lo ven los roles con el permiso `ayuda-contextual` concedido desde Gestión de roles
 * (ROLE_ADMIN lo tiene siempre, igual que el resto de pantallas). Al cliente nunca se le
 * muestra: el componente vive solo en las pantallas del panel de administración.
 *
 * El texto sale del catálogo por la ruta activa, así que basta con poner
 * `<app-ayuda-pantalla>` en la pantalla — no hay que pasarle nada.
 */
@Component({
  selector: 'app-ayuda-pantalla',
  templateUrl: './ayuda-pantalla.component.html',
  styleUrls: ['./ayuda-pantalla.component.scss']
})
export class AyudaPantallaComponent implements OnInit, OnDestroy {

  /** Ruta a explicar. Por defecto la ruta activa; se pasa a mano solo cuando la pantalla vive
   *  en una URL distinta a la del catálogo (ej. un modal abierto sobre otra pantalla). */
  @Input() ruta?: string;

  /** `true` monta el icono fijo en la esquina (una sola instancia global cubre todo el admin).
   *  `false` lo deja inline, para incrustarlo junto al título de una card concreta. */
  @Input() flotante = false;

  ayuda?: AyudaPantalla;
  abierto = false;
  puedeVer = false;

  private readonly subs = new Subscription();

  constructor(private readonly router: Router, private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.resolverAyuda();

    this.subs.add(
      this.router.events
        .pipe(filter((e: unknown): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => this.resolverAyuda())
    );

    // Los permisos llegan en el token y se re-emiten al refrescar la sesión, así que el icono
    // aparece/desaparece sin recargar la página.
    this.subs.add(this.auth.pantallas$.subscribe(() => this.recalcularPermiso()));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  abrir(): void  { this.abierto = true; }
  cerrar(): void { this.abierto = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrar(); }

  private resolverAyuda(): void {
    this.ayuda = ayudaDeRuta(this.ruta ?? this.router.url);
    this.abierto = false;
    this.recalcularPermiso();
  }

  private recalcularPermiso(): void {
    this.puedeVer = this.auth.isAdminService || this.auth.tienePantalla('ayuda-contextual');
  }
}
