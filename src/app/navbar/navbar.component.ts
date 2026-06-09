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

  countCarrito = 0;
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
    this.countCarrito = 0;
    this.countCarritoVariante = 0;
    this.serviceCarrito.limpiarCarrito();
    this.closeMobile();
    this.router.navigate(['/login']);
  }

  // ── Carrito ────────────────────────────────────────────────────────
  revisarProductosCarrito(): void { this.router.navigate(['/productos/detalle-productos']); }
  verCarritoVariante(): void { this.router.navigate(['/variantes/carrito']); }
  regresarProducto(): void { this.router.navigate(['/variantes/buscar']); }
  limpiarCarrito(): void {
    this.countCarrito = 0;
    this.serviceCarrito.limpiarCarrito();
  }

  // ── Tema claro/oscuro ──────────────────────────────────────────────
  toggleTheme(): void { this.themeService.toggle(); }
}
