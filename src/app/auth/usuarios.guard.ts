import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthenticateService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsuariosGuard implements CanActivate {
  constructor(
    private readonly auth: AuthenticateService,
    private readonly router: Router
  ) {}

  canActivate(): boolean {
    const token = this.auth.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.error(payload," payload");
        console.error((payload.roles || []).length === 0," payload");
      
      if (Date.now() > payload.exp * 1000) {
        this.auth.clearAccessToken();
        return true;
      }
      if ((payload.roles || []).length === 0) return true;

      this.router.navigate(['/productos/buscar']);
      return false;
    } catch {
      this.auth.clearAccessToken();
      return true;
    }
  }
}
