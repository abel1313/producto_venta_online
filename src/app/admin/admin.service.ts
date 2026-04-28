import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly url = `${environment.api_Url}/admin`;

  constructor(private readonly http: HttpClient) {}

  limpiarCache(): Observable<string[]> {
    return this.http.delete<{ data: string[] }>(`${this.url}/cache`)
      .pipe(map(res => res.data));
  }
}
