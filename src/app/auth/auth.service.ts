
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthenticateService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private userRoles = new BehaviorSubject<string[]>([]);
  userRoles$ = this.userRoles.asObservable();

  private userUser = new BehaviorSubject<string>('');
  userName$ = this.userUser.asObservable();

  private userId = new BehaviorSubject<number>(0);
  userId$ = this.userId.asObservable();

  // Pantallas efectivas (Ver) y acciones puntuales (Fase 3 de permisos, piloto en Modelos
  // 2026-08-27) -- mismos claims que ya usa navbar.component.ts para el menu dinamico, pero
  // expuestos aqui porque este es el servicio que ya inyectan las 26 pantallas admin que hoy
  // gatean sus botones con isAdminService/isAdminUser (roles.includes('ROLE_ADMIN') a secas,
  // desconectado del catalogo de pantallas/acciones). Reemplazar esas 26 pantallas es trabajo
  // aparte, pantalla por pantalla -- esto solo deja el mecanismo listo para usarse.
  private pantallas = new BehaviorSubject<string[]>([]);
  pantallas$ = this.pantallas.asObservable();

  private pantallasAcciones = new BehaviorSubject<string[]>([]); // formato "ruta:clave"
  pantallasAcciones$ = this.pantallasAcciones.asObservable();

  // El back ya manda este claim desde el arranque de Fase 2 (JwtUtil.generateToken, ver
  // comentario ahi) para que el front pueda mostrar/ocultar botones de escritura (crear/editar/
  // borrar) sin depender de isAdminUser -- pero hasta ahora nada en el front lo leia. Se suma
  // aqui, mismo patron que "pantallas"/"pantallasAcciones" (2026-09-05).
  private pantallasEscritura = new BehaviorSubject<string[]>([]);
  pantallasEscritura$ = this.pantallasEscritura.asObservable();

  constructor(private readonly auth: AuthenticateService) {
    const token = auth.getAccessToken();
    if (token) {
      this.setRolesFromToken(token);
    }
  }

  setRolesFromToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.userRoles.next(payload.roles || []);
      this.userUser.next(payload.sub || '');
      this.userId.next(payload.idUsuario || null);
      this.pantallas.next(payload.pantallas || []);
      this.pantallasAcciones.next(payload.pantallasAcciones || []);
      this.pantallasEscritura.next(payload.pantallasEscritura || []);
    } catch (e) {
      this.userRoles.next([]);
      this.userUser.next('');
      this.userId.next(0);
      this.pantallas.next([]);
      this.pantallasAcciones.next([]);
      this.pantallasEscritura.next([]);
    }
  }

  /** ¿Tiene esta pantalla concedida (Ver)? ROLE_ADMIN ya tiene las 45 pantallas sembradas, así
   * que también da true para admin -- no hace falta chequear isAdminService aparte. */
  tienePantalla(ruta: string): boolean {
    return this.pantallas.value.includes(ruta);
  }

  /** ¿Puede escribir (crear/editar) en esta pantalla, no solo verla? (Fase 2 de permisos de
   * accion) -- ej. tieneEscritura('palabras-clave'). Independiente de tieneAccion(): un rol
   * puede tener Editar sin una accion puntual como "eliminar", o viceversa. */
  tieneEscritura(ruta: string): boolean {
    return this.pantallasEscritura.value.includes(ruta);
  }

  /** ¿Puede usar esta acción puntual dentro de una pantalla? (Fase 3 de permisos, piloto en
   * Modelos 2026-08-27) -- ej. tieneAccion('productos/buscar', 'eliminar'). */
  tieneAccion(ruta: string, clave: string): boolean {
    return this.pantallasAcciones.value.includes(`${ruta}:${clave}`);
  }

  /** Id del usuario en sesión, sin tener que suscribirse — mismo estilo que `isAdminService`. */
  get userIdValue(): number {
    return this.userId.value;
  }

  get isAdminService(): boolean {
    return this.userRoles.value.includes('ROLE_ADMIN');
  }


}
