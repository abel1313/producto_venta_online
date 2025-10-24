import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsuariosGuard implements CanActivate {
  constructor(private router: Router,
   
  ) { }

  canActivate(): boolean {
    const token = localStorage.getItem('token');

    // ✅ Si NO hay token, permitir acceso
    if (!token) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;

      // ✅ Si el token está expirado, permitir acceso
      if (Date.now() > exp) {
        localStorage.removeItem('token');
        return true;
      }

      const roles = payload.roles || [];

      // ✅ Si no hay roles o están vacíos, permitir acceso
      if (roles.length === 0) {
        return true;
      }

      // ❌ Si hay roles válidos, redirigir y bloquear acceso
      this.router.navigate(['/productos/buscar']);
      return false;

    } catch (e) {
      // ✅ Si el token es inválido, permitir acceso
      localStorage.removeItem('token');
      return true;
    }
  }
  
}
