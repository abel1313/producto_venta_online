
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
    } catch (e) {
      this.userRoles.next([]);
      this.userUser.next('');
      this.userId.next(0);
      this.pantallas.next([]);
      this.pantallasAcciones.next([]);
    }
  }

  /** ¿Tiene esta pantalla concedida (Ver)? ROLE_ADMIN ya tiene las 45 pantallas sembradas, así
   * que también da true para admin -- no hace falta chequear isAdminService aparte. */
  tienePantalla(ruta: string): boolean {
    return this.pantallas.value.includes(ruta);
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
