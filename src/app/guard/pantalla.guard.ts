import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticateService } from '../auth.service';

// Reemplaza a AdminGuardGuard en las rutas del catálogo de pantallas (Fase 1 de
// PLAN_PERMISOS_PANTALLAS.md, repo compartido): en vez de preguntar "¿eres ROLE_ADMIN?",
// pregunta "¿el usuario tiene alguna pantalla asignada bajo este segmento de ruta?" -- el JWT
// ya trae la lista de rutas (Submenu.ruta) efectivas (rol + sus excepciones, ver
// UsuarioServiceImpl.submenusEfectivos / AuthController.pantallasEfectivas).
//
// Granularidad: se compara contra el PRIMER segmento de la ruta protegida (ej. "productos",
// "admin"), no contra la ruta completa -- mismo nivel de "puede entrar a este módulo" que ya
// tenía AdminGuardGuard. Rutas internas del módulo (ej. "usuarios/update") no catalogadas como
// Submenu propio siguen abriéndose una vez adentro; afinar eso pantalla por pantalla es trabajo
// de Fase 2 (permisos de acción), no de esta guard.
//
// Hoy ROLE_ADMIN tiene TODAS las pantallas sembradas y los demás roles NINGUNA -- así que esto
// se comporta idéntico a AdminGuardGuard mientras no se le asignen pantallas a otro rol desde
// Gestión de roles.
@Injectable({
  providedIn: 'root'
})
export class PantallaGuard implements CanActivate {
  constructor(
    private readonly auth: AuthenticateService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const payload = this.auth.getPayload();
    if (!payload) {
      this.auth.clearAccessToken();
      return this.router.parseUrl('/login');
    }
    if (Date.now() > payload.exp * 1000) {
      this.auth.clearAccessToken();
      return this.router.parseUrl('/login');
    }

    const pantallas: string[] = payload.pantallas || [];
    const segmento = route.routeConfig?.path ?? '';
    const tieneAcceso = pantallas.some(p => p === segmento || p.startsWith(segmento + '/'));

    if (tieneAcceso) return true;
    return this.router.parseUrl('/tienda/buscar');
  }
}
