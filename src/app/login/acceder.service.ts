import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccederService {

  private readonly url: string = `${environment.api_Url}/productos`;
  private readonly urlImg: string = `${environment.api_Url}/imagen`;
  constructor(
    private readonly http: HttpClient
  ) { }

  login(credentials: any) {
    return this.http.post<any>(`${environment.api_Url}/auth/login`, credentials);
  }

  registrar(credentials: any) {
    return this.http.post<any>(`${environment.api_Url}/auth/registrar`, credentials);
  }

}
