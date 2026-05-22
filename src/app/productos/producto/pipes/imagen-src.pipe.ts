import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Pipe({ name: 'imagenSrc' })
export class ImagenSrcPipe implements PipeTransform {

  constructor(private readonly http: HttpClient) {}

  private normalizeUrl(url: string): string {
    // /imagenes/{id} → /imagenes/file/{id}  (el micro cambió el endpoint)
    return url.replace(/(\/imagenes\/)(\d+)$/, '$1file/$2');
  }

  transform(url: string | null | undefined): Observable<string | null> {
    if (!url) return of(null);
    return this.http.get(this.normalizeUrl(url), { responseType: 'blob' }).pipe(
      switchMap(blob => new Observable<string | null>(observer => {
        if (!blob || blob.size === 0) { observer.next(null); observer.complete(); return; }
        const reader = new FileReader();
        reader.onload  = () => { observer.next(reader.result as string); observer.complete(); };
        reader.onerror = () => { observer.next(null); observer.complete(); };
        reader.readAsDataURL(blob);
      })),
      catchError(() => of(null))
    );
  }
}
