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

  private userId = new BehaviorSubject<number>(0);
  userId$ = this.userId.asObservable();

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
      this.userId.next(payload.idUsuario || null);
      console.log('loggggg ', payload.idUsuario)
    } catch (e) {
      this.userRoles.next([]);
      this.userUser.next('');
      this.userId.next(0);
    }
  }

}
