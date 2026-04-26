import { IconService } from './../Icon/icon.service';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AuthenticateService } from '../auth.service';
import { AccederService } from '../login/acceder.service';
import { Router } from '@angular/router';
import { CarritoService } from '../services/carrito/carrito.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';
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
  countCarritoVariante: number = 0;

  constructor(private readonly authService: AuthService,
    private readonly auth: AuthenticateService,
    private readonly acceder: AccederService,
    public readonly iconService: IconService,
    private readonly router: Router,
    public readonly serviceCarrito: CarritoService,
    private readonly carritoVariante: CarritoVarianteService
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

    this.carritoVariante.carrito$.subscribe(items => {
      this.countCarritoVariante = items.reduce((s, i) => s + i.cantidad, 0);
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
    this.acceder.logout().subscribe({
      complete: () => this.limpiarSesionLocal(),
      error: () => this.limpiarSesionLocal(),
    });
  }

  private limpiarSesionLocal(): void {
    this.auth.clearAccessToken();
    this.authService.setRolesFromToken('');
    this.roles = [];
    this.usuario = '';
    this.countCarrito = 0;
    this.serviceCarrito.limpiarCarrito();
    this.router.navigate(['/login']);
  }


  revisarProductosCarrito() {
    this.router.navigate(['/productos/detalle-productos']);
  }

  verCarritoVariante() {
    this.router.navigate(['/variantes/carrito']);
  }

    regresarProducto() {
    this.router.navigate(['/variantes/buscar']);
  }

      limpiarCarrito() {
    this.countCarrito = 0;
    this.serviceCarrito.limpiarCarrito();
  }




}
