import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthenticateService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class SinRegistroGuard implements CanActivate {
  constructor(
    private readonly auth: AuthenticateService,
    private readonly router: Router
  ) {}

  canActivate(): boolean {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!(payload.roles || []).includes('ROLE_ADMIN')) return true;
      this.router.navigate(['/productos/buscar']);
      return false;
    } catch {
      this.auth.clearAccessToken();
      this.router.navigate(['/login']);
      return false;
    }
  }
}
