import { ITokenData, IUsuarioDto } from './models/index.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IResponseGeneric } from 'src/shared/responseGeneric.model';

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

  logout() {
    return this.http.post<void>(`${environment.api_Url}/v1/auth/logout`, {}, { withCredentials: true });
  }

  registrar(credentials: any) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/registrar`, credentials);
  }

  olvidoPassword(email: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/olvide-password`, { email });
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

  enviarCodigoVerificacionUsuario(userName: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/enviar-codigo-verificacion`, { userName });
  }

  verificarCorreoUsuario(userName: string, codigo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/verificar-correo`, { userName, codigo });
  }

  miPerfil(username: string) {
    return this.http.put<any>(`${environment.api_Url}/v1/auth/mi-perfil`, { username });
  }

  solicitarCambioCorreo(correoNuevo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/solicitar-cambio-correo`, { correoNuevo });
  }

  confirmarCambioCorreo(codigo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/confirmar-cambio-correo`, { codigo });
  }

  cambioCorreoPendiente() {
    return this.http.get<any>(`${environment.api_Url}/v1/auth/cambio-correo-pendiente`);
  }

}
