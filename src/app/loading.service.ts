import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private count = 0;
  private guardia: any = null;

  /**
   * Tope de seguridad del overlay.
   *
   * El overlay tapa la pantalla entera (position:fixed, 100vw/100vh, z-index 9999) y solo se
   * baja en el finalize() del interceptor. Una peticion que nunca termina ni falla lo dejaba
   * arriba para siempre: pasaba justo con el detalle del premio en la ruleta publica, donde el
   * visitante cerraba el modal y la pagina seguia sin responder a un solo clic, como trabada.
   * Pasado este tope se suelta la pantalla pase lo que pase. La peticion sigue su curso; lo
   * unico que se pierde es el aviso de "cargando".
   */
  private static readonly TOPE_MS = 45000;

  show() {
    this.count++;
    this.loadingSubject.next(true);
    this.armarGuardia();
  }

  hide() {
    if (this.count > 0) this.count--;
    if (this.count === 0) this.soltar();
  }

  private armarGuardia() {
    if (this.guardia !== null) return;
    this.guardia = setTimeout(() => {
      this.guardia = null;
      if (this.count === 0) return;
      console.warn('[loading] overlay forzado a bajar: alguna peticion nunca termino');
      this.count = 0;
      this.loadingSubject.next(false);
    }, LoadingService.TOPE_MS);
  }

  private soltar() {
    if (this.guardia !== null) {
      clearTimeout(this.guardia);
      this.guardia = null;
    }
    this.loadingSubject.next(false);
  }
}
