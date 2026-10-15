import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticateService } from '../../auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Botón "Regresar" de las páginas legales (privacidad, eliminar datos, términos).
 *
 * Esas rutas son PÚBLICAS a propósito (Meta y TikTok las abren sin sesión), así que el botón solo
 * se muestra con sesión vigente: a un visitante sin sesión no se le ofrece volver a pantallas
 * internas. Con sesión regresa a la pantalla exacta de la que se vino; si la página se abrió
 * directo (no hay pantalla anterior en esta visita), manda al inicio.
 */
@Component({
  selector: 'app-regresar-legal',
  template: `
    <button type="button" class="rl-btn" *ngIf="conSesion" (click)="regresar()">
      ← Regresar
    </button>
  `,
  styles: [`
    .rl-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 18px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--card-border);
      background: transparent;
      color: var(--app-text);
      font-size: .88rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
    }
    .rl-btn:hover { background: var(--app-accent-soft); }
    .rl-btn:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 2px; }
  `]
})
export class RegresarLegalComponent implements OnInit, OnDestroy {

  /** Pantalla de la app desde la que se llegó, o null si la página se abrió directo. */
  private readonly urlAnterior: string | null;
  private destroy$ = new Subject<void>();

  /** Bandera: se actualiza cuando la sesión cambia */
  conSesion = false;

  constructor(private readonly auth: AuthenticateService, private readonly router: Router) {
    // Se lee al construir: el componente se crea mientras la navegación actual sigue en curso,
    // y ahí previousNavigation es la pantalla anterior de ESTA visita (null tras abrir directo o
    // recargar). Así nunca se regresa a un sitio de fuera (TikTok, Meta) como haría history.back().
    const anterior = this.router.getCurrentNavigation()?.previousNavigation?.finalUrl;
    this.urlAnterior = anterior ? this.router.serializeUrl(anterior) : null;
  }

  ngOnInit(): void {
    // Evalúa sesión al iniciar
    this.evaluarSesion();
    // Se re-evalúa cada vez que la sesión cambia (login, logout, refresh token)
    this.auth.getSessionChanges$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.evaluarSesion());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private evaluarSesion(): void {
    const payload = this.auth.getPayload();
    this.conSesion = !!payload && (!payload.exp || Date.now() < payload.exp * 1000);
  }

  regresar(): void {
    this.router.navigateByUrl(this.urlAnterior ?? '/');
  }
}
