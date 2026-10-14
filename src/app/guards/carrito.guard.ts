import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { CarritoService } from '../services/carrito/carrito.service';

/**
 * @deprecated 2026-10-14 — este guard solo valida el carrito de PRODUCTO BASE, que ya no se usa: solo se vende por artículos
 * (carrito de artículos: CarritoVarianteService). Se deja marcado para decidir más adelante si se
 * elimina; sigue enlazado en el login, la sesión, el navbar y varias rutas, así que quitarlo
 * requiere cuidado. Ver PENDIENTES_HOMOLOGACION_2026-10-14.md, sección G.
 */
@Injectable({
  providedIn: 'root'
})
export class CarritoGuard implements CanActivate {
 constructor(private carritoService: CarritoService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    this.carritoService.validarCarrito(); // ✅ Validación centralizada
    return true; // Siempre permite la navegación
  }
  
}
