import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagoTarjetaService } from '../pago-tarjeta.service';
import { ICobroTarjeta } from '../models/pago-tarjeta.model';

type Fase = 'confirmando' | 'aprobado' | 'rechazado' | 'cancelado' | 'bloqueado' | 'noEncontrado';

/**
 * A donde regresa el cliente desde la página de pago de Mercado Pago (back_urls del Checkout Pro).
 *
 * NO se fía de lo que trae la dirección (`status`, `payment_id`): solo usa `external_reference` (el id del cobro) para
 * preguntarle al back, que a su vez le pregunta a Mercado Pago y comprueba que el cobro sea del usuario. Mientras
 * el cobro siga en proceso vuelve a preguntar cada ~3 s, hasta ~1 minuto.
 */
@Component({
  selector: 'app-pago-resultado',
  templateUrl: './pago-resultado.component.html',
  styleUrls: ['./pago-resultado.component.scss']
})
export class PagoResultadoComponent implements OnInit, OnDestroy {

  fase: Fase = 'confirmando';
  pedidoId: number | null = null;

  private timer: ReturnType<typeof setInterval> | null = null;
  private intentos = 0;
  private static readonly MAX_INTENTOS = 20;

  constructor(
    private readonly ruta: ActivatedRoute,
    private readonly router: Router,
    private readonly pagoTarjetaService: PagoTarjetaService
  ) {}

  ngOnInit(): void {
    const id = Number(this.ruta.snapshot.queryParamMap.get('external_reference'));
    if (!Number.isInteger(id) || id <= 0) {
      this.fase = 'noEncontrado';
      return;
    }
    this.preguntar(id);
    this.timer = setInterval(() => this.preguntar(id), 3000);
  }

  ngOnDestroy(): void {
    this.detener();
  }

  verMisPedidos(): void {
    this.router.navigate(['/pedidos/mis-pedidos']);
  }

  private preguntar(id: number): void {
    this.pagoTarjetaService.estado(id).subscribe({
      next: cobro => this.aplicar(cobro),
      error: err => {
        if (err?.status === 404) {          // no existe o no es del usuario
          this.detener();
          this.fase = 'noEncontrado';
        } else if (++this.intentos >= PagoResultadoComponent.MAX_INTENTOS) {
          this.detener();
          this.fase = 'bloqueado';
        }
      }
    });
  }

  private aplicar(cobro: ICobroTarjeta): void {
    this.pedidoId = cobro.pedidoId;
    switch (cobro.estado) {
      case 'APROBADO': this.detener(); this.fase = 'aprobado'; break;
      case 'RECHAZADO': this.detener(); this.fase = 'rechazado'; break;
      case 'CANCELADO':
      case 'EXPIRADO': this.detener(); this.fase = 'cancelado'; break;
      case 'CREADO':
      case 'ENVIADO':
        if (++this.intentos >= PagoResultadoComponent.MAX_INTENTOS) {
          this.detener();
          this.fase = 'bloqueado';
        }
        break;
      default: this.detener(); this.fase = 'bloqueado';   // COBRADO_SIN_APLICAR, DEVUELTO…
    }
  }

  private detener(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
