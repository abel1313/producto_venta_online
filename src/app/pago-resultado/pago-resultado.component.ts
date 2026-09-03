import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagoService } from '../pedidos/pago.service';

/**
 * Pantalla de retorno del checkout online (Mercado Pago Checkout Pro / PayPal, 2026-09-03) --
 * a la que redirigen back_urls/return_url/cancel_url. Ruta PÚBLICA a propósito (sin AuthGuard),
 * mismo criterio que TiktokCallbackComponent: la pasarela redirige aquí desde SU propio dominio,
 * no desde la app, así que un guard podría interferir antes de leer los query params.
 *
 * - Mercado Pago: el pago ya se confirma solo por webhook (servidor a servidor) -- aquí solo se
 *   muestra el mensaje según `estado` (que nosotros mismos mandamos en back_urls).
 * - PayPal: NO alcanza con la aprobación -- hay que capturar la orden explícitamente aquí
 *   (PagoService.capturarOrdenPaypal), usando el `token` que PayPal agrega solo a la URL (es el
 *   orderId, ver PayPalCheckoutService.crearOrden).
 */
@Component({
  selector: 'app-pago-resultado',
  templateUrl: './pago-resultado.component.html',
  styleUrls: ['./pago-resultado.component.scss']
})
export class PagoResultadoComponent implements OnInit {

  estado: 'success' | 'pending' | 'failure' | null = null;
  proveedor: string | null = null;
  pedidoId: string | null = null;
  capturando = false;
  errorCaptura: string | null = null;

  constructor(private readonly route: ActivatedRoute, private readonly pagoService: PagoService) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.estado = params.get('estado') as 'success' | 'pending' | 'failure' | null;
    this.proveedor = params.get('proveedor');
    this.pedidoId = params.get('pedidoId');

    if (this.proveedor === 'paypal' && this.estado === 'success') {
      const orderId = params.get('token');
      if (!orderId) {
        this.errorCaptura = 'PayPal no mandó el identificador de la orden.';
        return;
      }
      this.capturando = true;
      this.pagoService.capturarOrdenPaypal(orderId).subscribe({
        next: () => { this.capturando = false; },
        error: (err) => {
          this.capturando = false;
          this.errorCaptura = err?.error?.mensaje ?? 'No se pudo confirmar el pago con PayPal.';
        }
      });
    }
  }
}
