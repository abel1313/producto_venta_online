import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { CarritoService } from '../services/carrito/carrito.service';

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
