import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { HttpClient } from '@angular/common/http';
import { IUsuarioDto } from '../usuarios/usuarios/models/usuario.dto';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService extends CrudGenericService<IUsuarioDto> {

  public userUpdate = new BehaviorSubject<IUsuarioDto>({
    email: '',
    enabled: false,
    rol: '',
    username: ''
  }
  );
  userUpdate$ = this.userUpdate.asObservable();

  constructor(httpClient: HttpClient) {
    super(httpClient, 'v1/usuarios');
  }


  getDataPage(page: number, size: number, buscar: string, activos: boolean = true): Observable<ResponseGeneric<IUsuarioDto>> {
    return this.http.get<ResponseGeneric<IUsuarioDto>>(`${this.url}/v1/usuarios/getAllPage?buscar=${buscar}&page=${page}&size=${size}&activos=${activos}`);
  }

  restablecerContra(data: any, tipoDato: number) {
    return this.http.put<any>(`${environment.api_Url}/v1/usuarios/updateUsuario/${tipoDato}`, data);
  }
  eliminarUsuarioDto(tipoDato: number) {
    return this.http.delete<any>(`${environment.api_Url}/v1/usuarios/eliminarUsuarioDto/${tipoDato}`);
  }
  // Contraparte de eliminarUsuarioDto -- reactiva a alguien a quien se le hizo soft-delete.
  activarUsuario(tipoDato: number) {
    return this.http.put<any>(`${environment.api_Url}/v1/usuarios/${tipoDato}/activar`, {});
  }
  buscarClientePorIdUsuario(idUsuario: number) {
    return this.http.get<boolean>(`${environment.api_Url}/v1/usuarios/buscarClientePorIdUsuario/${idUsuario}`);
  }

  /**
   * Mismo tratamiento que `AccederService.cambiarPassword` — ver el comentario largo allá.
   * Angular parsea como JSON por default; si el back contesta la contraseña temporal como texto
   * suelto, el parseo revienta y salta el error **con status 200**. Se pide como texto y se
   * convierte solo si de verdad es JSON, así el componente sigue leyendo `res?.data` igual.
   */
  resetearPassword(id: number) {
    return this.http
      .put(`${environment.api_Url}/v1/usuarios/${id}/resetear-password`, {}, { responseType: 'text' })
      .pipe(map(raw => {
        if (raw == null || raw === '') return null as any;
        try { return JSON.parse(raw); } catch { return { mensaje: raw, data: raw }; }
      }));
  }

  solicitarCambioCorreoAdmin(id: number, correoNuevo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/usuarios/${id}/solicitar-cambio-correo`, { correoNuevo });
  }

  confirmarCambioCorreoAdmin(id: number, codigo: string) {
    return this.http.post<any>(`${environment.api_Url}/v1/usuarios/${id}/confirmar-cambio-correo`, { codigo });
  }

  cambioCorreoPendienteAdmin(id: number) {
    return this.http.get<any>(`${environment.api_Url}/v1/usuarios/${id}/cambio-correo-pendiente`);
  }
}
