import { Directive, Input, OnInit, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { GrupoPedidoService } from '../grupo-pedido.service';
import { AbonoGrupoResponse, GrupoPedidos, PedidoDelGrupo } from '../models/grupo-pedido.model';
import { FormularioCobroBase } from './formulario-cobro.base';

/**
 * Cobro de un GRUPO de pedidos unidos (`POST /v1/grupos-pedido/{grupoId}/abonos`), igual que
 * "💵 Abonar al grupo" del detalle: el dinero es del grupo y el back lo reparte del pedido más viejo
 * al más nuevo. El grupo se lee fresco al abrir (el saldo de la card puede ser de hace rato).
 */
@Directive()
export abstract class CobroGrupoBase extends FormularioCobroBase implements OnInit {
  /** El titular: es la card que se ve en la lista. */
  @Input() pedidoId!: number;

  private readonly grupoService = inject(GrupoPedidoService);

  grupo: GrupoPedidos | null = null;

  get saldo(): number {
    return this.grupo?.saldoGrupo ?? 0;
  }

  /** Los pedidos que cuentan para el cobro (los cancelados ya no deben nada). */
  get pedidosVivos(): PedidoDelGrupo[] {
    return (this.grupo?.pedidos ?? []).filter(p => (p.estadoPedido ?? '').toLowerCase() !== 'cancelado');
  }

  ngOnInit(): void {
    this.grupoService.porPedido(this.pedidoId).subscribe({
      next: r => {
        this.grupo = r?.data?.activo ? r.data : null;
        this.cargando = false;
        if (!this.grupo) {
          Swal.fire({ icon: 'info', title: 'Este pedido ya no está unido', text: 'Recarga la lista y cóbralo por separado.' });
          this.cerrar.emit();
          return;
        }
        this.alCargar();
      },
      error: () => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo abrir el grupo', text: 'Revisa tu conexión e inténtalo de nuevo.' });
        this.cerrar.emit();
      }
    });
  }

  /** Cada formulario pone el monto con el que arranca. */
  protected abstract alCargar(): void;

  protected cobrar(): Observable<unknown> {
    const efectivo = this.metodoPago === 'EFECTIVO';
    const monto = this.monto;
    return this.grupoService.abonar(this.grupo!.grupoId, {
      monto,
      metodoPago: this.metodoPago,
      montoDado: efectivo && this.montoDado > 0 ? this.montoDado : undefined,
      nota: this.nota.trim() || undefined
    }).pipe(tap(r => this.mostrarResultado(monto, r?.data ?? null)));
  }

  /** Mismo resumen que el detalle: no se enseña el reparto por pedido, el dinero es del grupo. */
  private mostrarResultado(monto: number, res: AbonoGrupoResponse | null): void {
    const g = res?.grupo;
    const renglon = (etiqueta: string, valor: number, fuerte = false) =>
      `<p style="margin:4px 0">${etiqueta}: ${fuerte ? '<b>' : ''}$${valor.toFixed(2)}${fuerte ? '</b>' : ''}</p>`;
    const html = renglon('Pagado hoy', monto, true)
      + (g ? renglon('Pagado del grupo', g.pagadoGrupo) + renglon('Falta', g.saldoGrupo, true) : '')
      + (res && res.cambio > 0 ? renglon('Cambio para el cliente', res.cambio, true) : '');
    Swal.fire({ icon: 'success', title: g && g.saldoGrupo <= 0.001 ? 'Grupo pagado' : 'Abono registrado', html });
  }
}
