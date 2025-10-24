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

 
    if (token) {
      console.log('token 123', token)
      this.router.navigate(['/productos/buscar']);
      return true;
    }

    return false;
  }
  
}
