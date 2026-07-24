import { IconService } from './../Icon/icon.service';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AuthenticateService } from '../auth.service';
import { AccederService } from '../login/acceder.service';
import { Router } from '@angular/router';
import { CarritoService } from '../services/carrito/carrito.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';
import { ThemeService } from '../services/theme/theme.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  roles: string[] = [];
  isAdminUser = false;
  usuario = '';

  countCarritoVariante = 0;

  // Sidebar state
  isExpanded = false;
  openGroup: string | null = null;
  isMobileOpen = false;

  constructor(
    private readonly authService: AuthService,
    private readonly auth: AuthenticateService,
    private readonly acceder: AccederService,
    public readonly iconService: IconService,
    private readonly router: Router,
    public readonly serviceCarrito: CarritoService,
    private readonly carritoVariante: CarritoVarianteService,
    public readonly themeService: ThemeService,
  ) { }

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userName$.subscribe(user => { this.usuario = user; });

    this.carritoVariante.carrito$.subscribe(items => {
      const v = items.reduce((s, i) => s + i.cantidad, 0);
      const p = this.carritoVariante.obtenerPromos().reduce((s, pr) => s + pr.cantidadCombos, 0);
      this.countCarritoVariante = v + p;
    });
    this.carritoVariante.promos$.subscribe(() => {
      const v = this.carritoVariante.obtener().reduce((s, i) => s + i.cantidad, 0);
      const p = this.carritoVariante.obtenerPromos().reduce((s, pr) => s + pr.cantidadCombos, 0);
      this.countCarritoVariante = v + p;
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

  get username(): string { return this.usuario; }

  // ── Sidebar expand/collapse (desktop hover) ────────────────────────
  onMouseEnter(): void { this.isExpanded = true; }

  onMouseLeave(): void {
    this.isExpanded = false;
    this.openGroup = null;
  }

  // ── Accordion ──────────────────────────────────────────────────────
  toggleGroup(name: string): void {
    if (!this.isExpanded && !this.isMobileOpen) {
      this.isExpanded = true;
    }
    this.openGroup = this.openGroup === name ? null : name;
  }

  // ── Mobile ─────────────────────────────────────────────────────────
  toggleMobile(): void { this.isMobileOpen = !this.isMobileOpen; }

  closeMobile(): void {
    this.isMobileOpen = false;
    this.openGroup = null;
  }

  // ── Auth ───────────────────────────────────────────────────────────
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
    this.countCarritoVariante = 0;
    // Al cerrar sesión sí se limpian AMBOS carritos (el de productos también,
    // aunque ya no se muestre en el footer — no debe quedar en localStorage).
    this.serviceCarrito.limpiarCarrito();
    this.carritoVariante.limpiar();
    this.closeMobile();
    this.router.navigate(['/login']);
  }

  // ── Carrito ────────────────────────────────────────────────────────
  verCarritoVariante(): void { this.router.navigate(['/tienda/carrito']); }
  regresarProducto(): void { this.router.navigate(['/tienda/buscar']); }

  // Limpia el carrito que el botón "Carrito" del footer muestra (variantes +
  // promos). NO toca el carrito viejo de productos: ese se limpia desde
  // /productos/detalle-productos, su propia pantalla.
  limpiarCarrito(): void {
    this.carritoVariante.limpiar();
  }

  // ── Tema claro/oscuro ──────────────────────────────────────────────
  toggleTheme(): void { this.themeService.toggle(); }
}
