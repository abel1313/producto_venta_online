import { IconService } from './../Icon/icon.service';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AuthenticateService } from '../auth.service';
import { AccederService } from '../login/acceder.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CarritoService } from '../services/carrito/carrito.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';
import { ThemeService } from '../services/theme/theme.service';
import { SesionService } from '../shared/sesion.service';
import { NegocioService } from '../negocio/negocio.service';
import Swal from 'sweetalert2';

// Mapeo ruta → grupo del accordion, para que la sección de la ruta activa se
// recuerde entre navegaciones en vez de cerrarse siempre (ver comentario en
// ngOnInit). Cada entrada es el routerLink tal cual aparece en el template.
const GROUP_ROUTES: { group: string; paths: string[] }[] = [
  { group: 'misproductos', paths: ['productos/buscar', 'productos/agregar', 'tienda/venta', 'carga-imagenes', 'tienda/cargar-excel', 'palabras-clave', 'lugares-entrega'] },
  { group: 'pedidos',      paths: ['pedidos/mis-pedidos', 'pedidos/historial-mp'] },
  { group: 'ventas',       paths: ['tienda/venta-directa', 'ventas/buscar', 'abonos', 'gastos/buscar'] },
  { group: 'analitica',    paths: ['dashboard', 'reportes', 'clientes/buscar'] },
  { group: 'rifas',        paths: ['rifas/agregar', 'rifas/mes', 'rifas/buscar'] },
  // 'flores/zonas' es la misma pantalla que 'lugares-entrega' de Inventario, con ruta propia
  // justamente para que el acordeón no salte de grupo al entrar desde aquí.
  { group: 'flores',       paths: ['flores/ramos', 'flores/configurar', 'flores/catalogos', 'flores/entregas', 'flores/ramos-admin', 'flores/zonas', 'flores/frases'] },
  { group: 'imagenes',     paths: ['admin/presentacion', 'admin/diagnostico-imagenes', 'admin/reconciliacion-imagenes', 'admin/cache'] },
  { group: 'sistema',      paths: ['usuarios/buscar', 'admin/negocio', 'admin/chat', 'admin/promociones', 'admin/cinta'] },
];

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

  // Grupo del accordion que corresponde a la ruta actual — se recalcula en cada
  // navegación y es lo que "recuerda" la sección activa (ver onMouseEnter/Leave).
  private activeGroup: string | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly auth: AuthenticateService,
    private readonly acceder: AccederService,
    public readonly iconService: IconService,
    private readonly router: Router,
    public readonly serviceCarrito: CarritoService,
    private readonly carritoVariante: CarritoVarianteService,
    public readonly themeService: ThemeService,
    private readonly sesion: SesionService,
    private readonly negocioService: NegocioService,
  ) { }

  // ── Abrir/cerrar negocio (acceso rápido desde el menú) ───────────────
  // Reusa los mismos endpoints ya conectados en Admin > Negocio & Contactos
  // (GET /v1/negocio/estado, POST /v1/negocio/abrir|cerrar) — esto es solo un
  // atajo de un clic desde el menú principal, no reemplaza esa pantalla.
  negocioAbierto: boolean | null = null;
  activandoNegocio = false;

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
      if (this.isAdminUser && this.negocioAbierto === null) this.cargarEstadoNegocio();
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

    // La sección del menú que corresponde a la ruta activa se "recuerda": al
    // navegar a /pedidos/mis-pedidos, por ejemplo, el grupo "Pedidos" queda
    // marcado como el que se debe mostrar abierto la próxima vez que se
    // expanda el sidebar (hover en desktop, tap en móvil) — no se resetea a
    // cerrado en cada navegación como antes. Cambiar a otra sección reemplaza
    // cuál es la "activa" (un solo grupo abierto a la vez, igual que antes).
    this.activeGroup = this.computeActiveGroup(this.router.url);
    this.openGroup = this.activeGroup;
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.activeGroup = this.computeActiveGroup((e as NavigationEnd).urlAfterRedirects);
      // Solo re-sincroniza si el sidebar no está con un grupo abierto manualmente
      // a media navegación (ej. el usuario está explorando otra sección con el
      // mouse encima sin haber hecho clic en un link) — en la práctica, como
      // cada click de subitem navega, esto simplemente sigue a la ruta activa.
      this.openGroup = this.activeGroup;
    });
  }

  // Ruta (sin querystring, sin "/" inicial) → nombre del grupo del accordion al
  // que pertenece, o null si la ruta no vive dentro de ningún grupo (ej. Tienda,
  // Promociones, Favoritos, que son links directos fuera del accordion).
  private computeActiveGroup(url: string): string | null {
    const clean = (url ?? '').split('?')[0].replace(/^\//, '');
    const candidatos = GROUP_ROUTES
      .flatMap(g => g.paths.map(path => ({ group: g.group, path })))
      .sort((a, b) => b.path.length - a.path.length);
    const hit = candidatos.find(c => clean === c.path || clean.startsWith(c.path + '/'));
    return hit?.group ?? null;
  }

  hasRole(...allowedRoles: string[]): boolean {
    return allowedRoles.some(role => this.roles.includes(role));
  }

  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }

  get username(): string { return this.usuario; }

  // ── Sidebar expand/collapse (desktop hover) ────────────────────────
  onMouseEnter(): void {
    this.isExpanded = true;
    // Al expandir, siempre vuelve a mostrar la sección de la ruta activa —
    // no lo que haya quedado manualmente abierto en un hover anterior.
    this.openGroup = this.activeGroup;
  }

  onMouseLeave(): void {
    this.isExpanded = false;
    // Ya no se resetea a null: se recuerda la sección activa para la próxima
    // vez que se expanda el sidebar, en vez de perderla cada vez.
    this.openGroup = this.activeGroup;
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
    this.openGroup = this.activeGroup;
  }

  // ── Auth ───────────────────────────────────────────────────────────
  logout(): void {
    this.acceder.logout().subscribe({
      complete: () => this.limpiarSesionLocal(),
      error: () => this.limpiarSesionLocal(),
    });
  }

  private limpiarSesionLocal(): void {
    // El borrado en sí vive en SesionService — mismo código que usan las 4 pantallas de
    // cambio de contraseña, para que no se separen con el tiempo. Aquí solo queda lo que es
    // propio del sidebar (su estado visual).
    this.roles = [];
    this.usuario = '';
    this.countCarritoVariante = 0;
    this.closeMobile();
    this.sesion.cerrarSesionLocal();
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

  // ── Abrir/cerrar negocio (acceso rápido) ─────────────────────────────
  private cargarEstadoNegocio(): void {
    this.negocioService.getEstado().subscribe({
      next: (res: any) => { this.negocioAbierto = (res?.data ?? res)?.abierto ?? null; },
      error: () => {}
    });
  }

  // Abre o cierra el negocio con la hora de apertura/cierre YA configurada en
  // Admin > Negocio & Contactos — este botón no toca esa configuración, solo
  // activa/desactiva "abierto" con un clic, sin tener que ir a esa pantalla.
  toggleNegocioRapido(): void {
    if (this.activandoNegocio || this.negocioAbierto === null) return;
    this.activandoNegocio = true;
    const accion$ = this.negocioAbierto ? this.negocioService.cerrar() : this.negocioService.abrir();
    accion$.subscribe({
      next: () => {
        this.negocioAbierto = !this.negocioAbierto;
        this.activandoNegocio = false;
        Swal.fire({
          icon: 'success',
          title: this.negocioAbierto ? '¡Negocio abierto!' : 'Negocio cerrado',
          timer: 1400,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.activandoNegocio = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo cambiar el estado',
          text: err?.error?.mensaje ?? err?.error?.message ?? 'Inténtalo de nuevo.'
        });
      }
    });
  }
}
