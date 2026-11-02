import { Component, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subscription, timer } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';
import { EscanerCelularService } from './escaner-celular.service';

type Fase = 'cerrado' | 'abriendo' | 'esperando' | 'recibido' | 'vencida' | 'error';

/**
 * Botón «📱» que se pone junto a cualquier campo de código de barras. Al pulsarlo sale un QR; con el celular se abre y se
 * escanea el código, y aquí llega solo (`codigo`). Es de 1 en 1: al llegar un código se cierra la conexión y se emite;
 * para otro código se vuelve a pulsar. La PC pregunta cada ~1.5 s mientras el cuadro está abierto.
 */
@Component({
  selector: 'app-escaner-celular',
  templateUrl: './escaner-celular.component.html',
  styleUrls: ['./escaner-celular.component.scss']
})
export class EscanerCelularComponent implements OnDestroy {
  /** Texto del botón; sin él solo sale el ícono (para ponerlo junto al 📷). */
  @Input() etiqueta = '';
  /** Lo que llegó del celular, tal cual (el campo que lo recibe decide si lo pasa a mayúsculas). */
  @Output() codigo = new EventEmitter<string>();

  fase: Fase = 'cerrado';
  direccion = '';
  mensaje = '';
  recibido = '';

  private sesionId: string | null = null;
  private ultimaSecuencia = 0;
  private sondeo: Subscription | null = null;
  private apertura: Subscription | null = null;
  private erroresSeguidos = 0;

  constructor(private readonly svc: EscanerCelularService) {}

  get visible(): boolean { return this.fase !== 'cerrado'; }

  abrir(): void {
    if (this.fase === 'abriendo') return;           // doble clic: ya se está preparando la conexión
    this.cerrarConexion();
    this.fase = 'abriendo';
    this.mensaje = '';
    this.recibido = '';
    this.ultimaSecuencia = 0;
    this.erroresSeguidos = 0;
    this.apertura = this.svc.abrir().subscribe({
      next: s => {
        if (this.fase !== 'abriendo') {                // el usuario cerró el cuadro antes de que respondiera el servidor
          this.svc.cerrar(s.id).subscribe({ error: () => {} });
          return;
        }
        this.sesionId = s.id;
        this.direccion = this.svc.direccionParaElCelular(s.id);
        this.fase = 'esperando';
        this.empezarASondear();
      },
      error: (err: HttpErrorResponse) => this.fallar(err, 'No se pudo preparar la conexión con el celular.')
    });
  }

  /** Cierra el cuadro sin esperar nada. */
  cerrar(): void {
    this.cerrarConexion();
    this.fase = 'cerrado';
  }

  ngOnDestroy(): void {
    this.cerrarConexion();
  }

  /** Recargar o cerrar la pestaña con el cuadro abierto: se avisa para no dejar la conexión ocupando cupo. */
  @HostListener('window:pagehide')
  alSalirDeLaPagina(): void {
    if (this.sesionId) this.svc.cerrarAlSalir(this.sesionId);
  }

  private empezarASondear(): void {
    this.sondeo?.unsubscribe();
    const id = this.sesionId;
    if (!id) return;
    // exhaustMap: si una pregunta tarda, no se encima otra. Cada respuesta se descarta si ya es de una conexión anterior.
    this.sondeo = timer(1500, 1500).pipe(
      exhaustMap(() => this.svc.leer(id, this.ultimaSecuencia).pipe(
        catchError((err: HttpErrorResponse) => of(err))
      ))
    ).subscribe(respuesta => {
      if (id !== this.sesionId || this.fase !== 'esperando') return;
      if (respuesta instanceof HttpErrorResponse) {
        if (respuesta.status === 410) { this.terminarSondeo(); this.fase = 'vencida'; return; }
        // Un error suelto de red no tumba la conexión; varios seguidos sí avisan.
        if (++this.erroresSeguidos >= 5) this.fallar(respuesta, 'Se perdió la comunicación con el servidor.');
        return;
      }
      this.erroresSeguidos = 0;
      this.ultimaSecuencia = respuesta.ultimaSecuencia;
      const primero = respuesta.codigos[0];
      if (primero) this.alLlegar(primero.codigo);
    });
  }

  private alLlegar(codigo: string): void {
    this.recibido = codigo;
    this.fase = 'recibido';
    this.cerrarConexion();
    this.codigo.emit(codigo);
    // Se deja ver «Recibido» un momento y se cierra solo.
    setTimeout(() => { if (this.fase === 'recibido') this.fase = 'cerrado'; }, 1200);
  }

  private fallar(err: HttpErrorResponse, porDefecto: string): void {
    this.terminarSondeo();
    this.mensaje = err?.error?.mensaje ?? porDefecto;
    this.fase = 'error';
  }

  private terminarSondeo(): void {
    this.sondeo?.unsubscribe();
    this.sondeo = null;
  }

  /** Deja de preguntar y le avisa al servidor que ya no hace falta (si falla, la conexión vence sola a los 30 minutos). */
  private cerrarConexion(): void {
    this.terminarSondeo();
    this.apertura?.unsubscribe();
    this.apertura = null;
    const id = this.sesionId;
    this.sesionId = null;
    if (id) this.svc.cerrar(id).subscribe({ error: () => {} });
  }
}
