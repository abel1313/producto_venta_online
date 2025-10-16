import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  roles: string[] = [];
  isAdminUser: boolean = false;
  usuario: string = '';

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      console.log(this.roles, '--------------------');
      console.log(roles);
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userName$.subscribe(user => {
      this.usuario = user;
    });
  }

  hasRole(...allowedRoles: string[]): boolean {
    return allowedRoles.some(role => this.roles.includes(role));
  }

  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }

  get username(): string | null {
    return this.usuario;
  }

}
