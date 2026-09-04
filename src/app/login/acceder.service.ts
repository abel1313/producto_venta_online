import { ITokenData, IUsuarioDto } from './models/index.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IResponseGeneric } from 'src/shared/responseGeneric.model';
import { ResponseGeneric } from 'src/shared/generic-response.mode';

@Injectable({
  providedIn: 'root'
})
export class AccederService {

  private readonly url: string = `${environment.api_Url}/v1/productos`;
  private readonly urlImg: string = `${environment.api_Url}/imagen`;
  constructor(
    private readonly http: HttpClient
  ) { }

  /**
   * Convierte una respuesta pedida como texto en objeto, **solo si de verdad es JSON**.
   *
   * ⚠️ Existe por un bug real: Angular parsea como JSON por default, así que si el back contesta
   * un texto suelto (`ResponseEntity.ok("Contrasena actualizada correctamente")` en Spring →
   * `text/plain`) el parseo revienta y **se dispara el callback de error aunque el status sea
   * 200**. La app pintaba "Error al cambiar la contraseña" sobre una operación que sí había
   * funcionado — y en el log del back no aparecía ningún error, porque no lo hubo.
   *
   * Lo insidioso es que los ERRORES sí llegan como JSON (los arma su `@ControllerAdvice`), así
   * que se veían bien; solo el camino de éxito fallaba.
   *
   * Es indiferente si el back devuelve JSON: se parsea igual y el shape no cambia.
   */
  private parseoTolerante<T = any>(obs: Observable<string>): Observable<T> {
    return obs.pipe(map(raw => {
      if (raw == null || raw === '') return null as unknown as T;
      try { return JSON.parse(raw) as T; } catch { return { mensaje: raw, data: raw } as unknown as T; }
    }));
  }

  login(credentials: IUsuarioDto) {
    return this.http.post<IResponseGeneric<ITokenData>>(`${environment.api_Url}/v1/auth/login`, credentials, { withCredentials: true });
  }

  refresh() {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/refresh`, {}, { withCredentials: true });
  }

  // ⚠️ Los 6 endpoints con `parseoTolerante` de aquí abajo son los que el back confirmó
  // (2026-08-16) que responden **texto plano** en el camino de éxito. Sin esto, Angular no puede
  // parsearlos como JSON y **dispara el error con status 200** — la app dice que falló algo que
  // sí funcionó. Ver el comentario largo en `parseoTolerante`.
  logout() {
    return this.parseoTolerante(this.http.post(
      `${environment.api_Url}/v1/auth/logout`, {}, { withCredentials: true, responseType: 'text' }
    ));
  }

  registrar(credentials: any) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/registrar`, credentials);
  }

  olvidoPassword(email: string) {
    return this.parseoTolerante(this.http.post(
      `${environment.api_Url}/v1/auth/olvide-password`, { email }, { responseType: 'text' }
    ));
  }

  // Mismo tratamiento que `cambiarPassword`: el camino de éxito puede venir como texto plano.
  restablecerPassword(email: string, codigo: string, nuevaPassword: string) {
    return this.parseoTolerante(this.http.post(
      `${environment.api_Url}/v1/auth/restablecer-password`,
      { email, codigo, nuevaPassword },
      { responseType: 'text' }
    ));
  }

  cambiarPassword(passwordActual: string, nuevaPassword: string) {
    return this.parseoTolerante(this.http.put(
      `${environment.api_Url}/v1/auth/cambiar-password`,
      { passwordActual, nuevaPassword },
      { responseType: 'text' }
    ));
  }

  // forzarNuevo=false (default): si ya hay un código vigente sin usar, el back lo reutiliza y
  // NO manda otro correo -- evita invalidar en silencio uno que el usuario todavía no alcanza a
  // leer, cuando el envío lo dispara la propia app (cargar la pantalla, login fallido por correo
  // sin verificar, modal de verificación del admin). El botón explícito "Reenviar código" debe
  // mandar forzarNuevo=true -- ahí sí quiere uno nuevo sí o sí.
  enviarCodigoVerificacionUsuario(userName: string, forzarNuevo = false) {
    return this.parseoTolerante(this.http.post(
      `${environment.api_Url}/v1/auth/enviar-codigo-verificacion`, { userName, forzarNuevo }, { responseType: 'text' }
    ));
  }

  // El peor de la lista: sin esto, una verificación **exitosa** se le mostraba al usuario como
  // "código incorrecto o expirado", y volvía a intentar con un código que ya se había consumido.
  verificarCorreoUsuario(userName: string, codigo: string) {
    return this.parseoTolerante(this.http.post(
      `${environment.api_Url}/v1/auth/verificar-correo`, { userName, codigo }, { responseType: 'text' }
    ));
  }

  miPerfil(username: string) {
    return this.parseoTolerante(this.http.put(
      `${environment.api_Url}/v1/auth/mi-perfil`, { username }, { responseType: 'text' }
    ));
  }

  // Solo lectura -- incluye si el usuario aceptó el aviso de privacidad y cuándo.
  // ⚠️ Este endpoint envuelve la respuesta como { mensaje, code, data } (ResponseGeneric del
  // back), NO como { response } -- ver ResponseGeneric.java. Distinto del resto de este
  // servicio (login, etc.), que no pasa por esa clase.
  obtenerMiPerfil() {
    return this.http.get<ResponseGeneric<{ username: string; email: string; aceptoPrivacidad: boolean; fechaAceptoPrivacidad: string | null }>>(
      `${environment.api_Url}/v1/auth/mi-perfil`
    );
  }

  solicitarCambioCorreo(correoNuevo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/solicitar-cambio-correo`, { correoNuevo });
  }

  // Para cuentas que nunca pasaron por el registro publico (ej. admin) y por eso nunca tuvieron
  // oportunidad de aceptar el aviso de privacidad.
  aceptarPrivacidad() {
    return this.http.post<ResponseGeneric<string>>(`${environment.api_Url}/v1/auth/aceptar-privacidad`, {});
  }

  confirmarCambioCorreo(codigo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/confirmar-cambio-correo`, { codigo });
  }

  cambioCorreoPendiente() {
    return this.http.get<any>(`${environment.api_Url}/v1/auth/cambio-correo-pendiente`);
  }

}
