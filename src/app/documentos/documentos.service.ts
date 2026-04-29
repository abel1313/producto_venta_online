import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ICargaExcelResponse {
  insertados: number;
  omitidos:   number;
  errores:    string[];
}

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly url = `${environment.api_Url}/documentos/productos`;

  constructor(private readonly http: HttpClient) {}

  subirExcel(archivo: File): Observable<ICargaExcelResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    // NO se pone Content-Type — el browser lo agrega con el boundary correcto
    return this.http.post<ICargaExcelResponse>(this.url, formData);
  }
}
