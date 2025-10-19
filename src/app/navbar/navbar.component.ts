import { IconService } from './../Icon/icon.service';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { CarritoService } from '../services/carrito/carrito.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  roles: string[] = [];
  isAdminUser: boolean = false;
  usuario: string = '';

  countCarrito: number = 0;

  constructor(private readonly authService: AuthService,
    public readonly iconService: IconService,
    private readonly router: Router,
    public readonly serviceCarrito: CarritoService
  ) { }

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userName$.subscribe(user => {
      this.usuario = user;
    });

    this.serviceCarrito.carritoDetalle$.subscribe(detalle => {
      this.countCarrito = detalle.reduce((sum, item) => sum + item.cantidad, 0);
    });

    window.addEventListener('storage', () => {
      this.serviceCarrito.validarCarrito();
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

  logout(): void {
    localStorage.removeItem('token');
    this.authService.setRolesFromToken(''); // limpia los roles y usuario
    this.roles = [];
    this.usuario = '';
    this.router.navigate(['/login']); // opcional: redirige sin recargar
  }


  revisarProductosCarrito() {
    this.router.navigate(['/productos/detalle-productos']);
  }




}
