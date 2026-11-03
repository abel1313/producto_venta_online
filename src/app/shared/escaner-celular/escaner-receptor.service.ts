import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { EscanerCelularService, LecturaEscaner } from './escaner-celular.service';

type AlRecibir = (codigo: string) => void;
type AlRecibirFoto = (fotoDataUrl: string) => void;
/** Una pantalla que recibe: códigos de barras, fotos o las dos. */
interface Receptora { codigo?: AlRecibir; foto?: AlRecibirFoto; }

const CLAVE_LIDER = 'escaner.pestana';
/** Si una respuesta vacía llega antes de esto, la pregunta fue desplazada (hay otras preguntas abiertas de la cuenta): se espera antes de repetir. */
const RESPUESTA_VACIA_RAPIDA_MS = 1000;
const PAUSA_TRAS_VACIA_RAPIDA_MS = 1500;

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

  private readonly receptoras: Receptora[] = [];
  /** Lo que se pidió al servidor en la pregunta abierta actual (si cambia, se repite la pregunta). */
  private aceptaActual = 'codigo';
  private espera: Subscription | null = null;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  private desde: number | null = null;       // null = todavía no se sabe desde qué número preguntar (se pregunta el estado primero)
  private epoca: number | null = null;       // «época» de la conexión del servidor: si cambia, se rehízo y hay que pedir desde el principio de la nueva
  /** Identifica a ESTA pestaña: solo la que el usuario tiene a la vista y usó por última vez escucha (varias pestañas de la misma cuenta no duplican). */
  private readonly idPestana = Math.random().toString(36).slice(2);
  private errores = 0;
  /** Cuenta los arranques: una respuesta de un ciclo anterior (ya detenido) se descarta. */
  private ciclo = 0;

  private readonly alCambiarVisibilidad = () => { if (document.visibilityState === 'visible') this.reclamarLiderazgo(); this.actualizar(); };
  private readonly alEnfocar = () => { this.reclamarLiderazgo(); this.actualizar(); };
  private readonly alCambiarAlmacen = (e: StorageEvent) => { if (e.key === CLAVE_LIDER) this.actualizar(); };

  constructor(private readonly svc: EscanerCelularService, private readonly zona: NgZone) {
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    window.addEventListener('focus', this.alEnfocar);
    window.addEventListener('storage', this.alCambiarAlmacen);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    window.removeEventListener('focus', this.alEnfocar);
    window.removeEventListener('storage', this.alCambiarAlmacen);
    this.detener();
  }

  /** Una pantalla pide recibir códigos. Devuelve la función que la da de baja (llamarla al destruirse). */
  registrar(alRecibir: AlRecibir): () => void {
    return this.agregar({ codigo: alRecibir });
  }

  /** Una pantalla pide recibir FOTOS del celular (data URL JPEG). Devuelve la función que la da de baja. */
  registrarFotos(alRecibir: AlRecibirFoto): () => void {
    return this.agregar({ foto: alRecibir });
  }

  private agregar(r: Receptora): () => void {
    this.receptoras.push(r);
    if (document.visibilityState === 'visible') this.reclamarLiderazgo();      // la pantalla que acaba de abrirse y se ve es la que escucha
    this.actualizar();
    return () => {
      const i = this.receptoras.indexOf(r);
      if (i >= 0) this.receptoras.splice(i, 1);
      this.actualizar();
    };
  }

  /** Qué hay que pedirle al servidor según las pantallas registradas: `codigo`, `foto` o `codigo,foto`. */
  private acepta(): string {
    const partes: string[] = [];
    if (this.receptoras.some(r => r.codigo)) partes.push('codigo');
    if (this.receptoras.some(r => r.foto)) partes.push('foto');
    return partes.join(',') || 'codigo';
  }

  private ultima(tipo: 'codigo' | 'foto'): Receptora | undefined {
    for (let i = this.receptoras.length - 1; i >= 0; i--) if (this.receptoras[i][tipo]) return this.receptoras[i];
    return undefined;
  }

  private debeEscuchar(): boolean {
    return this.receptoras.length > 0 && document.visibilityState === 'visible' && this.esLider();
  }

  /** La última pestaña que se vio o se enfocó es la que escucha; si la cuenta tiene varias abiertas, las demás callan (no se duplica el código). */
  private reclamarLiderazgo(): void {
    try { localStorage.setItem(CLAVE_LIDER, this.idPestana); } catch { /* sin almacenamiento: escucha cada pestaña visible */ }
  }

  private esLider(): boolean {
    try {
      const lider = localStorage.getItem(CLAVE_LIDER);
      if (lider === null) { this.reclamarLiderazgo(); return true; }
      return lider === this.idPestana;
    } catch { return true; }
  }

  private actualizar(): void {
    if (this.debeEscuchar() && !this.espera && !this.reintento) this.arrancar();
    else if (!this.debeEscuchar()) this.detener();
    else if (this.espera && this.desde !== null && this.acepta() !== this.aceptaActual) {
      // Apareció (o desapareció) una pantalla que recibe fotos: la pregunta abierta se repite pidiendo lo nuevo.
      const miCiclo = ++this.ciclo;
      this.espera.unsubscribe();
      this.espera = null;
      this.preguntar(miCiclo);
    }
  }

  private arrancar(): void {
    const miCiclo = ++this.ciclo;
    this.errores = 0;
    if (this.desde !== null) { this.preguntar(miCiclo); return; }
    // Primera vez: se parte de lo último que hay (lo que se escaneó antes de abrir la pantalla no se entrega).
    this.espera = this.svc.canalEstado().subscribe({
      next: e => { if (miCiclo !== this.ciclo) return; this.espera = null; this.desde = e.ultimaSecuencia; this.epoca = e.epoca; this.conectado$.next(e.celularConectado); this.preguntar(miCiclo); },
      error: (err: HttpErrorResponse) => { if (miCiclo === this.ciclo) { this.espera = null; this.fallo(miCiclo, err); } }
    });
  }

  private preguntar(miCiclo: number): void {
    const inicio = Date.now();
    this.aceptaActual = this.acepta();
    this.espera = this.svc.canalEsperar(this.desde ?? 0, this.aceptaActual).subscribe({
      next: (lectura: LecturaEscaner) => {
        if (miCiclo !== this.ciclo) return;
        this.espera = null;
        this.errores = 0;
        this.conectado$.next(lectura.celularConectado);
        if (this.epoca !== null && lectura.epoca !== this.epoca) {
          // La conexión se rehízo en el servidor (venció y se abrió otra de la cuenta): se pide desde el principio de la nueva, sin saltarse sus primeros códigos.
          this.epoca = lectura.epoca;
          this.desde = 0;
          if (this.debeEscuchar()) this.preguntar(miCiclo);
          return;
        }
        this.epoca = lectura.epoca;
        this.desde = lectura.ultimaSecuencia;
        // Un código por escaneo: se entrega a la pantalla que acaba de aparecer (la última registrada que recibe códigos).
        const destino = this.ultima('codigo')?.codigo;
        if (destino) lectura.codigos.forEach(c => this.zona.run(() => destino(c.codigo)));
        const destinoFoto = this.ultima('foto')?.foto;
        const fotos = lectura.fotos ?? [];
        if (destinoFoto) fotos.forEach(f => this.zona.run(() => destinoFoto(f.foto)));
        if (!this.debeEscuchar()) return;
        if (lectura.codigos.length === 0 && fotos.length === 0 && Date.now() - inicio < RESPUESTA_VACIA_RAPIDA_MS) {
          // Contestó «nada» casi al instante: otra pregunta de la cuenta la desplazó. Se espera un poco antes de volver (evita un ir y venir sin fin).
          this.reintento = setTimeout(() => { this.reintento = null; if (miCiclo === this.ciclo && this.debeEscuchar()) this.preguntar(miCiclo); }, PAUSA_TRAS_VACIA_RAPIDA_MS);
          return;
        }
        this.preguntar(miCiclo);
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
    if (err.status === 410) { this.desde = null; this.epoca = null; }          // la conexión se rehízo en el servidor: se vuelve a tomar el estado
    const pausa = Math.min(15000, 2000 * Math.pow(2, this.errores++));
    this.reintento = setTimeout(() => {
      this.reintento = null;
      if (miCiclo === this.ciclo && this.debeEscuchar()) this.arrancar();
    }, pausa);
  }

  private detener(): void {
    this.ciclo++;
    this.desde = null;      // al volver a escuchar se parte de lo último que haya: lo escaneado mientras no se escuchaba no se entrega
    this.epoca = null;
    this.espera?.unsubscribe();
    this.espera = null;
    if (this.reintento) { clearTimeout(this.reintento); this.reintento = null; }
    if (this.receptoras.length === 0) this.conectado$.next(false);
  }
}
