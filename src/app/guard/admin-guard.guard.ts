import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticateService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuardGuard implements CanActivate {
  constructor(
    private readonly auth: AuthenticateService,
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    const token = this.auth.getAccessToken();
    if (!token) {
      return this.router.parseUrl('/login');
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Date.now() > payload.exp * 1000) {
        this.auth.clearAccessToken();
        return this.router.parseUrl('/login');
      }
      if ((payload.roles || []).includes('ROLE_ADMIN')) return true;
      return this.router.parseUrl('/tienda/buscar');
    } catch {
      this.auth.clearAccessToken();
      return this.router.parseUrl('/login');
    }
  }
}
