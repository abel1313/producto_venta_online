import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userRoles = new BehaviorSubject<string[]>([]);
  userRoles$ = this.userRoles.asObservable();

  private userUser = new BehaviorSubject<string>('');
  userName$ = this.userUser.asObservable();

  constructor() {
    const token = localStorage.getItem('token');
    if (token) {
      this.setRolesFromToken(token);
    }
  }

  setRolesFromToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.userRoles.next(payload.roles || []);
      this.userUser.next(payload.sub || '');
    } catch (e) {
      this.userRoles.next([]);
      this.userUser.next('');
    }
  }

}
