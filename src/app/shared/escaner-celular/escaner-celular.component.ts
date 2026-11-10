import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { EscanerReceptorService } from './escaner-receptor.service';
import { EscanerCelularService, LecturaEscaner } from './escaner-celular.service';

/**
 * - abriendo: preguntando si ya hay un celular enlazado
 * - qr: hay conexión pero el celular aún no está (se muestra el QR; solo la primera vez)
 * - listo: el celular está conectado: «escanea ahora» (lo normal después de la primera vez, sin QR)
 * - cuenta: con sesión iniciada; informa si el celular de la cuenta está conectado (los códigos llegan solos, sin pulsar nada)
 */
type Fase = 'cerrado' | 'abriendo' | 'qr' | 'listo' | 'recibido' | 'error' | 'cuenta';

/**
 * Botón «📱» que se pone junto a cualquier campo de código de barras. La PRIMERA vez sale un QR: se abre con el celular y queda una página
 * ligera con la cámara lista. Después la PC ya recuerda el celular: al pulsar «📱» no hay QR, se escanea y el código llega en
 * milisegundos (`codigo`). Es de 1 en 1: al llegar un código se cierra el cuadro; para otro se vuelve a pulsar.
 */
@Component({
  selector: 'app-escaner-celular',
  templateUrl: './escaner-celular.component.html',
  styleUrls: ['./escaner-celular.component.scss']
})
export class EscanerCelularComponent implements OnInit, OnDestroy {
  /** Texto del botón; sin él solo sale el ícono (para ponerlo junto al 📷). */
  @Input() etiqueta = '';
  /** Lo que llegó del celular, tal cual (el campo que lo recibe decide si lo pasa a mayúsculas). */
  @Output() codigo = new EventEmitter<string>();

  fase: Fase = 'cerrado';
  direccion = '';
  mensaje = '';
  recibido = '';

  private sesionId: string | null = null;
  private desde = 0;
  private espera: Subscription | null = null;
  private erroresSeguidos = 0;
  private reintento: ReturnType<typeof setTimeout> | null = null;
  /** Cuándo se creó la conexión actual: si el servidor la da por inexistente casi de inmediato (reinicio, dos copias) no se reabre en bucle. */
  private creadaEn = 0;
  /** Cuenta las aperturas: una respuesta tardía de una apertura anterior se descarta. */
  private intento = 0;

  /** ¿El celular de la cuenta está conectado? (solo con sesión iniciada). */
  conectado = false;
  /** Dirección de la página del celular de la cuenta (para el QR). */
  direccionDeLaCuenta = '';
  private desregistrar: (() => void) | null = null;
  private suscripcionConectado: Subscription | null = null;

  constructor(
    private readonly svc: EscanerCelularService,
    private readonly receptor: EscanerReceptorService,
    private readonly authService: AuthService
  ) {}

  /**
   * Con sesión iniciada (el personal) NO hay QR por escaneo: la PC y el celular de la misma cuenta se encuentran solos. Mientras este botón
   * existe la pantalla está lista para recibir: el celular escanea y el código llega aquí, sin pulsar nada. Sin sesión (visitante de la
   * tienda) se usa el QR de siempre.
   */
  get modoCuenta(): boolean { return this.authService.rolesValue.length > 0; }

  ngOnInit(): void {
    if (!this.modoCuenta) return;
    this.direccionDeLaCuenta = this.svc.direccionDelEscanerDeLaCuenta();
    this.suscripcionConectado = this.receptor.conectado$.subscribe(c => { this.conectado = c; });
    this.desregistrar = this.receptor.registrar(codigo => {
      this.codigo.emit(codigo);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', titleText: `Código recibido: ${codigo}`, showConfirmButton: false, timer: 1800 });
    });
  }

  get visible(): boolean { return this.fase !== 'cerrado'; }

  abrir(): void {
    if (this.modoCuenta) { this.fase = 'cuenta'; return; }    // solo informa: los códigos ya llegan solos
    if (this.fase === 'abriendo') return;           // doble clic
    this.detenerEspera();
    const miIntento = ++this.intento;
    this.fase = 'abriendo';
    this.mensaje = '';
    this.recibido = '';
    this.erroresSeguidos = 0;

    const guardada = this.svc.sesionGuardada();
    if (!guardada) { this.crearConexion(miIntento); return; }
    // Ya hay un celular enlazado de antes: si sigue vigente se usa tal cual (sin QR si está conectado).
    this.svc.estado(guardada).subscribe({
      next: e => {
        if (!this.esActual(miIntento)) return;
        if (!e.vigente) { this.svc.olvidarSesion(); this.crearConexion(miIntento); return; }
        this.empezar(guardada, e.ultimaSecuencia, e.celularConectado);
      },
      error: (err: HttpErrorResponse) => {
        if (!this.esActual(miIntento)) return;
        if (err.status === 410 || err.status === 404) { this.svc.olvidarSesion(); this.crearConexion(miIntento); return; }
        this.fallar(err, 'No se pudo preparar la conexión con el celular.');
      }
    });
  }

  /** Cierra el cuadro (el celular sigue enlazado para la próxima vez). */
  cerrar(): void {
    this.intento++;
    this.detenerEspera();
    this.fase = 'cerrado';
  }

  /** Olvida el celular enlazado (para usar otro): la próxima vez saldrá el QR. */
  desvincular(): void {
    const id = this.sesionId;
    this.cerrar();
    this.svc.olvidarSesion();
    if (id) this.svc.cerrar(id).subscribe({ error: () => {} });
    this.sesionId = null;
  }

  ngOnDestroy(): void {
    this.intento++;
    this.detenerEspera();
    this.desregistrar?.();
    this.suscripcionConectado?.unsubscribe();
  }

  private esActual(miIntento: number): boolean {
    return miIntento === this.intento && this.fase === 'abriendo';
  }

  private crearConexion(miIntento: number): void {
    this.svc.abrir().subscribe({
      next: s => {
        // Si cerraron el cuadro mientras respondía el servidor, la conexión recién creada se cierra (no se deja ocupando cupo).
        if (miIntento !== this.intento || this.fase !== 'abriendo') { this.svc.cerrar(s.id).subscribe({ error: () => {} }); return; }
        this.svc.guardarSesion(s.id);
        this.creadaEn = Date.now();
        this.empezar(s.id, 0, false);
      },
      error: (err: HttpErrorResponse) => {
        if (miIntento === this.intento && this.fase === 'abriendo') this.fallar(err, 'No se pudo preparar la conexión con el celular.');
      }
    });
  }

  private empezar(id: string, desde: number, celularConectado: boolean): void {
    this.sesionId = id;
    this.desde = desde;
    this.direccion = this.svc.direccionParaElCelular(id);
    this.fase = celularConectado ? 'listo' : 'qr';
    this.preguntar(id);
  }

  /** ¿Esta respuesta sigue siendo para lo que el usuario tiene a la vista? (mismo cuadro, misma conexión y esperando). */
  private vigente(miIntento: number, id: string): boolean {
    return miIntento === this.intento && id === this.sesionId && (this.fase === 'qr' || this.fase === 'listo');
  }

  /**
   * Deja la pregunta abierta en el servidor: contesta en cuanto el celular manda un código (o a los ~25 s con «nada», y se vuelve a
   * preguntar al instante). Mientras tanto cada respuesta dice si el celular sigue conectado, y el cuadro cambia entre QR y «escanea».
   */
  private preguntar(id: string): void {
    const miIntento = this.intento;
    this.espera = this.svc.esperar(id, this.desde).subscribe({
      next: (lectura: LecturaEscaner) => {
        if (!this.vigente(miIntento, id)) return;
        this.erroresSeguidos = 0;
        this.desde = lectura.ultimaSecuencia;
        this.fase = lectura.celularConectado ? 'listo' : 'qr';
        // Un código de cliente de campaña (UUID) no es para el campo de código de barras: solo va a «Código del cliente» (regla 2026-11-10).
        const primero = lectura.codigos.find(c => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((c.codigo ?? '').trim()));
        if (primero) { this.alLlegar(primero.codigo); return; }
        this.preguntar(id);
      },
      error: (err: HttpErrorResponse | Error) => {
        if (!this.vigente(miIntento, id)) return;
        if (err instanceof Error && err.name === 'TimeoutError') { this.preguntar(id); return; }   // conexión colgada: se vuelve a preguntar
        const http = err as HttpErrorResponse;
        if (http.status === 410) {
          // La conexión ya no existe (venció o se cerró).
          this.svc.olvidarSesion();
          this.sesionId = null;
          if (Date.now() - this.creadaEn < 10000) {
            // Recién creada y ya no existe (el servidor se reinició o hay dos copias): no se reabre en bucle.
            this.fallar(http, 'La conexión con el celular se cortó. Intenta de nuevo.');
            return;
          }
          this.fase = 'cerrado';
          this.abrir();                       // se arma otra y sale el QR
          return;
        }
        // Un error suelto de red no tumba la conexión: se reintenta unas veces antes de avisar.
        if (++this.erroresSeguidos >= 5) { this.fallar(http, 'Se perdió la comunicación con el servidor.'); return; }
        this.reintento = setTimeout(() => { this.reintento = null; if (this.vigente(miIntento, id)) this.preguntar(id); }, 1500);
      }
    });
  }

  private alLlegar(codigo: string): void {
    this.recibido = codigo;
    this.fase = 'recibido';
    this.detenerEspera();
    this.codigo.emit(codigo);
    // Se deja ver «Recibido» un instante y se cierra solo.
    setTimeout(() => { if (this.fase === 'recibido') this.fase = 'cerrado'; }, 900);
  }

  private fallar(err: HttpErrorResponse, porDefecto: string): void {
    this.detenerEspera();
    this.mensaje = err?.error?.mensaje ?? porDefecto;
    this.fase = 'error';
  }

  private detenerEspera(): void {
    this.espera?.unsubscribe();
    this.espera = null;
    if (this.reintento) { clearTimeout(this.reintento); this.reintento = null; }
  }
}
