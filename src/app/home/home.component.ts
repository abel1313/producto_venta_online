import { Component } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  constructor(private readonly authService: AuthService) { }

  /** Promociones pide sesión (AuthGuard): sin sesión el botón llevaría al login. */
  get conSesion(): boolean {
    return this.authService.rolesValue.length > 0;
  }
}
