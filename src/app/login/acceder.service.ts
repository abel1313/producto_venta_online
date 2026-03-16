import { ITokenData, IUsuarioDto } from './models/index.mode';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { IResponseGeneric } from 'src/shared/responseGeneric.model';

@Injectable({
  providedIn: 'root'
})
export class AccederService {

  private readonly url: string = `${environment.api_Url}/productos`;
  private readonly urlImg: string = `${environment.api_Url}/imagen`;
  constructor(
    private readonly http: HttpClient
  ) { }

  login(credentials: IUsuarioDto) {
    return this.http.post<IResponseGeneric<ITokenData>>(`${environment.api_auth}/auth/login`, credentials, { withCredentials: true });
  }

  registrar(credentials: any) {
    return this.http.post<any>(`${environment.api_Url}/auth/registrar`, credentials);
  }



}
