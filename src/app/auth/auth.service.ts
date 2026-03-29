
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthenticateService } from '../auth.service';

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

  constructor(private readonly auth: AuthenticateService) {
    const token = localStorage.getItem('token');
    const toke1 = auth.getAccessToken();
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
    } catch (e) {
      this.userRoles.next([]);
      this.userUser.next('');
      this.userId.next(0);
    }
  }

  get isAdminService(): boolean {
    return this.userRoles.value.includes('ROLE_ADMIN');
  }


}
