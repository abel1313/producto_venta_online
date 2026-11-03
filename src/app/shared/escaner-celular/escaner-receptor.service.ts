import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { EscanerCelularService, LecturaEscaner } from './escaner-celular.service';

type AlRecibir = (codigo: string) => void;

/**
 * Recibe los códigos que el CELULAR de la misma cuenta escanea y los entrega a la pantalla que esté a la vista.
 *
 * Cada pantalla con un campo de código de barras (`<app-escaner-celular>`) se REGISTRA como receptora mientras existe; si hay varias, recibe la
 * última en registrarse (la que acaba de aparecer). Mientras haya al menos una receptora y la pestaña esté a la vista, se deja una pregunta
 * abierta en el servidor (`canalEsperar`): el código llega en milisegundos. Sin receptoras no se pregunta nada, y el celular avisa «abre una
 * pantalla con código de barras». Solo con sesión iniciada (el servidor exige la sesión en `/v1/escaner/canal`).
 */
@Injectable({ providedIn: 'root' })
export class EscanerReceptorService implements OnDestroy {
  /** ¿El celular de esta cuenta está conectado? (lo dice cada respuesta del servidor). */
  readonly conectado$ = new BehaviorSubject<boolean>(false);

  private readonly receptoras: AlRecibir[] = [];
  private espera: Subscription | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private desde: number | null = null;       // null = todavía no se sabe desde qué número preguntar (se pregunta el estado primero)
  private errores = 0;
  /** Cuenta los arranques: una respuesta de un ciclo anterior (ya detenido) se descarta. */
  private ciclo = 0;

  private readonly alCambiarVisibilidad = () => this.actualizar();

  constructor(private readonly svc: EscanerCelularService, private readonly zona: NgZone) {
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.detener();
  }

  /** Una pantalla pide recibir códigos. Devuelve la función que la da de baja (llamarla al destruirse). */
  registrar(alRecibir: AlRecibir): () => void {
    this.receptoras.push(alRecibir);
    this.actualizar();
    return () => {
      const i = this.receptoras.indexOf(alRecibir);
      if (i >= 0) this.receptoras.splice(i, 1);
      this.actualizar();
    };
  }

  private debeEscuchar(): boolean {
    return this.receptoras.length > 0 && document.visibilityState === 'visible';
  }

  private actualizar(): void {
    if (this.debeEscuchar() && !this.espera && !this.reintento) this.arrancar();
    else if (!this.debeEscuchar()) this.detener();
  }

  private arrancar(): void {
    const miCiclo = ++this.ciclo;
    this.errores = 0;
    if (this.desde !== null) { this.preguntar(miCiclo); return; }
    // Primera vez: se parte de lo último que hay (lo que se escaneó antes de abrir la pantalla no se entrega).
    this.espera = this.svc.canalEstado().subscribe({
      next: e => { if (miCiclo !== this.ciclo) return; this.espera = null; this.desde = e.ultimaSecuencia; this.conectado$.next(e.celularConectado); this.preguntar(miCiclo); },
      error: (err: HttpErrorResponse) => { if (miCiclo === this.ciclo) { this.espera = null; this.fallo(miCiclo, err); } }
    });
  }

  private preguntar(miCiclo: number): void {
    this.espera = this.svc.canalEsperar(this.desde ?? 0).subscribe({
      next: (lectura: LecturaEscaner) => {
        if (miCiclo !== this.ciclo) return;
        this.espera = null;
        this.errores = 0;
        this.desde = lectura.ultimaSecuencia;
        this.conectado$.next(lectura.celularConectado);
        const destino = this.receptoras[this.receptoras.length - 1];
        // Un código por escaneo: se entrega a la pantalla que acaba de aparecer (la última registrada).
        if (destino) lectura.codigos.forEach(c => this.zona.run(() => destino(c.codigo)));
        if (this.debeEscuchar()) this.preguntar(miCiclo);
      },
      error: (err: HttpErrorResponse | Error) => {
        if (miCiclo !== this.ciclo) return;
        this.espera = null;
        if (err instanceof Error && err.name === 'TimeoutError') { this.preguntar(miCiclo); return; }   // conexión colgada: se vuelve a preguntar
        this.fallo(miCiclo, err as HttpErrorResponse);
      }
    });
  }

  /** Un error no apaga el receptor: se reintenta con pausa creciente (2 s, 4 s, … hasta 15 s). Sin sesión (401/403) se deja de insistir. */
  private fallo(miCiclo: number, err: HttpErrorResponse): void {
    this.conectado$.next(false);
    if (err.status === 401 || err.status === 403) return;
    if (err.status === 410) this.desde = null;          // la conexión se rehízo en el servidor: se vuelve a tomar el estado
    const pausa = Math.min(15000, 2000 * Math.pow(2, this.errores++));
    this.reintento = setTimeout(() => {
      this.reintento = null;
      if (miCiclo === this.ciclo && this.debeEscuchar()) this.arrancar();
    }, pausa);
  }

  private detener(): void {
    this.ciclo++;
    this.desde = null;      // al volver a escuchar se parte de lo último que haya: lo escaneado mientras no se escuchaba no se entrega
    this.espera?.unsubscribe();
    this.espera = null;
    if (this.reintento) { clearTimeout(this.reintento); this.reintento = null; }
    if (this.receptoras.length === 0) this.conectado$.next(false);
  }
}
