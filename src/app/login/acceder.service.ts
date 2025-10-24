import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ServerAPI } from 'src/environments/server';

@Injectable({
  providedIn: 'root'
})
export class AccederService {

  private readonly url: string = `${ServerAPI.serverApi}/productos`;
  private readonly urlImg: string = `${environment.api_Url}/imagen`;
  constructor(
    private readonly http: HttpClient
  ) { }

  login(credentials: any) {
    return this.http.post<any>(`${ServerAPI.serverApi}/auth/login`, credentials);
  }

  registrar(credentials: any) {
    return this.http.post<any>(`${ServerAPI.serverApi}/auth/registrar`, credentials);
  }

}
