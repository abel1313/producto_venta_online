import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SinRegistroGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    const roles = payload.roles || [];

    if (!roles.includes('ROLE_ADMIN')) {
      console.log("sin");
      return true;
    }

    this.router.navigate(['/productos/buscar']);
    return false;
  }
}
