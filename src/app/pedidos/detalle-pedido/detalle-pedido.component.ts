import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IPedidoGenerico } from '../mis-pedidos/models/IPedidoGenerico.model';
import { IDetalleQuery } from '../mis-pedidos/models/IDetallePedido.model';
import { environment } from 'src/environments/environment';
import { PedidosService } from '../pedidos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit {
  @Input() pedido!: IPedidoGenerico;
  @Output() regresarProductos = new EventEmitter<boolean>();

  public env: string = environment.api_Url + '/imagen/';

  constructor(private readonly pedidosService: PedidosService) {}

  ngOnInit(): void {}

  get totalGeneral(): number {
    return this.pedido.pedido.detalles.reduce((sum, d) => sum + d.sub_total, 0);
  }

  eliminando = new Set<IDetalleQuery>();

  reducirCantidad(item: IDetalleQuery): void {
    if (this.eliminando.has(item)) return;
    this.eliminando.add(item);

    this.pedidosService.eliminarDetalle(this.pedido.pedido.id, item.producto).subscribe({
      next: () => {
        item.cantidad -= 1;
        if (item.cantidad <= 0) {
          this.pedido.pedido.detalles = this.pedido.pedido.detalles.filter(d => d !== item);
        } else {
          item.sub_total = item.cantidad * item.precio_unitario;
        }
        this.eliminando.delete(item);
      },
      error: () => {
        this.eliminando.delete(item);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el producto.' });
      }
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/img/no-image.png';
  }

  irPedido(): void {
    this.regresarProductos.emit(false);
  }
}
