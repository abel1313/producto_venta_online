import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }
  // auth.service.ts
  private userRoles = new BehaviorSubject<string[]>([]);
  userRoles$ = this.userRoles.asObservable();

    // auth.service.ts
  private userUser = new BehaviorSubject<string>("");
  userName$ = this.userUser.asObservable();

  setRolesFromToken(token: string) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userRoles.next(payload.roles || []);
    this.setUsuario(token);
  }

    setUsuario(token: string) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userUser.next(payload.sub);
  }

}
