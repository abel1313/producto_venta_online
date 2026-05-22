import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Pipe({ name: 'imagenSrc' })
export class ImagenSrcPipe implements PipeTransform {

  constructor(private readonly http: HttpClient) {}

  private normalizeUrl(url: string): string {
    // /imagenes/{id} → /imagenes/file/{id}
    return url.replace(/(\/imagenes\/)(\d+)$/, '$1file/$2');
  }

  transform(url: string | null | undefined): Observable<string | null> {
    if (!url) return of(null);
    if (url.startsWith('data:')) return of(url);

    return this.http.get(this.normalizeUrl(url), {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      switchMap(response => {
        const blob = response.body;
        if (!blob || blob.size === 0) return of(null);

        const ct = response.headers.get('Content-Type') ?? '';

        return new Observable<string | null>(observer => {
          const reader = new FileReader();

          if (ct.includes('application/json') || ct.includes('text/plain')) {
            // Endpoint devuelve JSON { imagen: base64, contentType }
            reader.onload = () => {
              try {
                const json = JSON.parse(reader.result as string);
                const item = Array.isArray(json) ? json[0] : json;
                observer.next(item?.imagen ? `data:${item.contentType};base64,${item.imagen}` : null);
              } catch { observer.next(null); }
              observer.complete();
            };
            reader.onerror = () => { observer.next(null); observer.complete(); };
            reader.readAsText(blob);
          } else {
            // Endpoint devuelve bytes directos (image/jpeg, image/png, etc.)
            reader.onload  = () => { observer.next(reader.result as string); observer.complete(); };
            reader.onerror = () => { observer.next(null); observer.complete(); };
            reader.readAsDataURL(blob);
          }
        });
      }),
      catchError(() => of(null))
    );
  }
}
