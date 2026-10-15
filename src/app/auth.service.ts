import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthenticateService {

  constructor() { }

  private accessToken: string | null = null;
  private sessionChange$ = new Subject<void>();

  setAccessToken(token: string) {
    this.accessToken = token;
    this.sessionChange$.next();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken() {
    this.accessToken = null;
    this.sessionChange$.next();
  }

  /** Observable que emite cada vez que la sesión cambia (login, logout, refresh) */
  getSessionChanges$() {
    return this.sessionChange$.asObservable();
  }

  /** Claims del access token actual (roles, idUsuario, pantallas, exp…), o null si no hay token
   *  o no se puede parsear. Usado por PantallaGuard y por el navbar para el menú dinámico. */
  getPayload(): any | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

}
