import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticateService } from '../auth.service';
import { AuthService } from '../auth/auth.service';
import { CarritoService } from '../services/carrito/carrito.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';

/**
 * Borra la sesión del lado del navegador y manda al login.
 *
 * Existe para tener UN solo lugar donde se define "cerrar sesión localmente". Lo usan el
 * logout del sidebar y las 4 pantallas que cambian la contraseña — desde la tanda de
 * seguridad del back (2026-07-31), **cambiar la contraseña invalida el refresh token al
 * instante**, así que después de un cambio exitoso hay que volver a iniciar sesión sí o sí:
 * si el usuario se queda dentro, el siguiente refresh responde 401.
 *
 * NO llama a `POST /v1/auth/logout` — eso es responsabilidad de quien lo invoque cuando
 * aplique (en un cambio de contraseña el backend ya mató la sesión, no hay nada que cerrar).
 */
@Injectable({ providedIn: 'root' })
export class SesionService {

  constructor(
    private readonly auth: AuthenticateService,
    private readonly authRoles: AuthService,
    private readonly carrito: CarritoService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly router: Router
  ) {}

  cerrarSesionLocal(destino: string = '/login'): void {
    this.auth.clearAccessToken();
    this.authRoles.setRolesFromToken('');
    // Se limpian AMBOS carritos: el de variantes/promos y el viejo de productos, que ya no
    // se muestra en el sidebar pero sigue viviendo en localStorage.
    this.carrito.limpiarCarrito();
    this.carritoVariante.limpiar();
    this.router.navigate([destino]);
  }
}
