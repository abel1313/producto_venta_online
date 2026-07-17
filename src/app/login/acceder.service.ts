import { ITokenData, IUsuarioDto } from './models/index.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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

  restablecerPassword(email: string, codigo: string, nuevaPassword: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/auth/restablecer-password`, { email, codigo, nuevaPassword });
  }

  cambiarPassword(passwordActual: string, nuevaPassword: string) {
    return this.http.put<any>(`${environment.api_Url}/v1/auth/cambiar-password`, { passwordActual, nuevaPassword });
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
