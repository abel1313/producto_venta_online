import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isDark = new BehaviorSubject<boolean>(false);
  isDark$ = this._isDark.asObservable();

  get isDark(): boolean { return this._isDark.getValue(); }

  /** Llama una vez al iniciar la app — detecta la hora y aplica el tema automático. */
  init(): void {
    const hour = new Date().getHours();
    // 6:00 – 18:59 → claro | 19:00 – 5:59 → oscuro
    const autoDark = hour < 6 || hour >= 19;
    this.apply(autoDark);
  }

  toggle(): void { this.apply(!this._isDark.getValue()); }

  private apply(dark: boolean): void {
    this._isDark.next(dark);
    document.body.classList.toggle('theme-dark', dark);
    document.body.classList.toggle('theme-light', !dark);
  }
}
