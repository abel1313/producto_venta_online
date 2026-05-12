import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface ImagenResponse {
  imagen:      string;
  contentType: string;
}

@Pipe({ name: 'imagenSrc' })
export class ImagenSrcPipe implements PipeTransform {

  constructor(private readonly http: HttpClient) {}

  transform(url: string | null | undefined): Observable<string | null> {
    if (!url) return of(null);
    return this.http.get<ImagenResponse | ImagenResponse[]>(url).pipe(
      map(res => {
        const item = Array.isArray(res) ? res[0] : res;
        return item?.imagen ? `data:${item.contentType};base64,${item.imagen}` : null;
      }),
      catchError(() => of(null))
    );
  }
}
