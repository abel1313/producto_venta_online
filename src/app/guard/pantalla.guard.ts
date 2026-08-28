import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticateService } from '../auth.service';

// Reemplaza a AdminGuardGuard en las rutas del catálogo de pantallas (Fase 1 de
// PLAN_PERMISOS_PANTALLAS.md, repo compartido): en vez de preguntar "¿eres ROLE_ADMIN?",
// pregunta "¿el usuario tiene alguna pantalla asignada bajo esta ruta?" -- el JWT ya trae la
// lista de rutas (Submenu.ruta) efectivas (rol + sus excepciones, ver
// UsuarioServiceImpl.submenusEfectivos / AuthController.pantallasEfectivas).
//
// Granularidad: se arma la ruta COMPLETA desde la raíz (pathFromRoot), no solo el segmento de
// esta ActivatedRouteSnapshot -- necesario para poder usar este guard tanto a nivel de módulo
// (ej. "productos", solo llega el segmento "productos") como en una ruta hija específica dentro
// de un módulo ya montado (ej. "usuarios/buscar", donde esta snapshot solo trae "buscar" pero
// pathFromRoot ya incluye "usuarios" por delante). Agregado 2026-08-28 al encontrar que 5 módulos
// (clientes, tienda, usuarios, pedidos, flores) mezclan rutas públicas/de cliente con rutas admin
// dentro del mismo módulo, así que no se les puede poner este guard a nivel de módulo completo
// como a los demás -- hace falta por-ruta, con la ruta compuesta real.
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
    const segmento = route.pathFromRoot
      .map(r => r.routeConfig?.path)
      .filter((p): p is string => !!p)
      .join('/');
    const tieneAcceso = pantallas.some(p => p === segmento || p.startsWith(segmento + '/'));

    if (tieneAcceso) return true;
    return this.router.parseUrl('/tienda/buscar');
  }
}
