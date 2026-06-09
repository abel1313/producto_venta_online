import { Injectable } from '@angular/core';
import { CrudGenericService } from '../crud-generic.service';
import { HttpClient } from '@angular/common/http';
import { IUsuarioDto } from '../usuarios/usuarios/models/usuario.dto';
import { BehaviorSubject, Observable } from 'rxjs';
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


  getDataPage(page: number, size: number, buscar: string): Observable<ResponseGeneric<IUsuarioDto>> {
    return this.http.get<ResponseGeneric<IUsuarioDto>>(`${this.url}/v1/usuarios/getAllPage?buscar=${buscar}&page=${page}&size=${size}`);
  }

  restablecerContra(data: any, tipoDato: number) {
    return this.http.put<any>(`${environment.api_Url}/v1/usuarios/updateUsuario/${tipoDato}`, data);
  }
  eliminarUsuarioDto(tipoDato: number) {
    return this.http.delete<any>(`${environment.api_Url}/v1/usuarios/eliminarUsuarioDto/${tipoDato}`);
  }
  buscarClientePorIdUsuario(idUsuario: number) {
    return this.http.get<boolean>(`${environment.api_Url}/v1/usuarios/buscarClientePorIdUsuario/${idUsuario}`);
  }
}
