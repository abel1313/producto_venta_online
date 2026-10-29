import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PagoTarjetaService } from '../../pago-tarjeta.service';
import { CanalPago, ICobroTarjeta, IOfertaMeses } from '../../models/pago-tarjeta.model';

type Fase = 'cargando' | 'elegir' | 'procesando' | 'aprobado' | 'rechazado' | 'cancelado' | 'bloqueado' | 'noDisponible';

/**
 * Cobro de un pedido con tarjeta del módulo `/v1/pagos-tarjeta`, para los dos canales:
 *  - `EN_LINEA` (default): el cliente paga su propio pedido; queda pagado y falta entregarlo.
 *  - `TERMINAL`: el administrador cobra en el local con la terminal; el back lo deja pagado y entregado.
 * Cambian los textos; el flujo (meses, cobrar, preguntar cada ~3 s, cancelar) es el mismo.
 *
 * Elige de contado o a meses sin intereses (solo los que el back permite para ESE pedido), paga y la pantalla
 * pregunta el estado cada ~3 s mientras el cobro esté en proceso. Al aprobarse el pedido queda pagado y falta
 * entregarlo (la entrega no se decide aquí).
 *
 * Con la pasarela simulada de QA el cobro se aprueba solo a los ~4 s. Con Mercado Pago real, el cliente pasará por
 * la página de Checkout Pro y regresará aquí; esa parte se agrega cuando se conecte la pasarela real.
 */
@Component({
  selector: 'app-cobro-tarjeta',
  templateUrl: './cobro-tarjeta.component.html',
  styleUrls: ['./cobro-tarjeta.component.scss']
})
export class CobroTarjetaComponent implements OnChanges, OnDestroy {

  @Input() visible = false;
  @Input() pedidoId: number | null = null;
  /** Solo para mostrarlo: el back cobra el total real del pedido, nunca este número. */
  @Input() total = 0;
  @Input() canal: CanalPago = 'EN_LINEA';
  @Output() cerrar = new EventEmitter<void>();
  /** El pedido quedó pagado: la lista debe refrescarse. */
  @Output() pagado = new EventEmitter<void>();

  fase: Fase = 'cargando';
  oferta: IOfertaMeses | null = null;
  /** 1 = de contado; 3, 6, 9 o 12 = meses sin intereses. */
  cuotas = 1;
  mensaje: string | null = null;

  private cobroId: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private errores = 0;

  constructor(private readonly pagoTarjetaService: PagoTarjetaService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.pedidoId) {
      this.abrir(this.pedidoId);
    }
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private abrir(pedidoId: number): void {
    this.detener();
    this.fase = 'cargando';
    this.oferta = null;
    this.cuotas = 1;
    this.mensaje = null;
    this.cobroId = null;
    this.pagoTarjetaService.meses(pedidoId).subscribe({
      next: oferta => { this.oferta = oferta; this.fase = 'elegir'; },
      // 404 = este ambiente no tiene el pago con tarjeta (módulo apagado) o el pedido no es del usuario.
      error: () => { this.fase = 'noDisponible'; }
    });
  }

  get esTerminal(): boolean { return this.canal === 'TERMINAL'; }

  get mensualidad(): number | null {
    return this.cuotas > 1 ? Math.round((this.total / this.cuotas) * 100) / 100 : null;
  }

  pagar(): void {
    if (!this.pedidoId) return;
    this.fase = 'procesando';
    this.mensaje = null;
    this.errores = 0;
    this.pagoTarjetaService.iniciar({ pedidoId: this.pedidoId, canal: this.canal, cuotas: this.cuotas }).subscribe({
      next: cobro => {
        this.cobroId = cobro.id;
        this.aplicar(cobro);
        if (cobro.enProceso) this.empezarAPreguntar(cobro.id);
      },
      error: (err: HttpErrorResponse) => {
        this.mensaje = PagoTarjetaService.mensajeDeError(err);
        // 5xx: no se sabe si el cobro salió; no se deja reintentar a ciegas (el back evita el doble cobro).
        this.fase = err.status >= 500 ? 'bloqueado' : 'rechazado';
      }
    });
  }

  cancelar(): void {
    if (!this.cobroId) return;
    this.detener();
    const id = this.cobroId;
    this.pagoTarjetaService.cancelar(id).subscribe({
      next: cobro => this.aplicar(cobro),
      error: err => {
        // Si ya se había aprobado o no se sabe, se pregunta de nuevo antes de decir nada.
        this.mensaje = PagoTarjetaService.mensajeDeError(err);
        this.pagoTarjetaService.estado(id).subscribe({
          next: cobro => { this.aplicar(cobro); if (cobro.enProceso) this.fase = 'bloqueado'; },
          error: () => { this.fase = 'bloqueado'; }
        });
      }
    });
  }

  reintentar(): void {
    this.fase = 'elegir';
    this.mensaje = null;
    this.cobroId = null;
  }

  cerrarDialogo(): void {
    // Cerrar con un cobro en proceso lo cancela (no se deja una tarjeta cobrándose en segundo plano).
    if (this.fase === 'procesando' && this.cobroId) {
      this.detener();
      this.pagoTarjetaService.cancelar(this.cobroId).subscribe({ error: () => {} });
    }
    const fueAprobado = this.fase === 'aprobado';
    this.detener();
    if (fueAprobado) this.pagado.emit();
    this.cerrar.emit();
  }

  private aplicar(cobro: ICobroTarjeta): void {
    switch (cobro.estado) {
      case 'CREADO':
      case 'ENVIADO':
        this.fase = 'procesando';
        break;
      case 'APROBADO':
        this.detener();
        this.fase = 'aprobado';
        break;
      case 'RECHAZADO':
        this.detener();
        this.fase = 'rechazado';
        this.mensaje = this.esTerminal
          ? 'La tarjeta fue rechazada. Pueden probar con otra tarjeta o pagar en efectivo.'
          : 'Tu tarjeta fue rechazada. Puedes intentar con otra tarjeta.';
        break;
      case 'CANCELADO':
      case 'EXPIRADO':
        this.detener();
        this.fase = 'cancelado';
        break;
      default: // COBRADO_SIN_APLICAR, DEVUELTO, DEVUELTO_PARCIAL
        this.detener();
        this.fase = 'bloqueado';
        this.mensaje = this.esTerminal
          ? 'Hubo un problema con este cobro. No lo repitas: revisa la terminal y el pedido antes de cobrar otra vez.'
          : 'Hubo un problema con tu pago. No intentes pagar otra vez: avísanos y lo revisamos contigo.';
    }
  }

  private empezarAPreguntar(id: number): void {
    this.detener();
    this.timer = setInterval(() => {
      this.pagoTarjetaService.estado(id).subscribe({
        next: cobro => { this.errores = 0; this.aplicar(cobro); },
        error: () => {
          // Un error al preguntar no es un rechazo: el cobro puede haberse hecho. Se vuelve a preguntar unas veces.
          if (++this.errores >= 5) {
            this.detener();
            this.fase = 'bloqueado';
            this.mensaje = this.esTerminal
              ? 'No se pudo confirmar el cobro. Revisa la terminal antes de volver a cobrar.'
              : 'No pudimos confirmar tu pago. No intentes pagar otra vez: revisa tu pedido o avísanos.';
          }
        }
      });
    }, 3000);
  }

  private detener(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
