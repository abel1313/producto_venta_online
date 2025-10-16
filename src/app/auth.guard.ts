import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router,
   
  ) { }

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    // Verifica expiración del token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;

    if (Date.now() > exp) {
      localStorage.removeItem('token');
      this.router.navigate(['/login']);
      return false;
    }

    console.log(payload, '----------------------------------------------1111')
    const roles = payload.roles || [];

    if (roles.includes('ROLE_ADMIN')) {
      return true;
    }

    this.router.navigate(['/productos/buscar']);
    return false;
  }

}
