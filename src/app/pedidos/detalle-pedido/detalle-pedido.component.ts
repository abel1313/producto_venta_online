import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IPedidoGenerico } from '../mis-pedidos/models/IPedidoGenerico.model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit {
@Input() pedido!: IPedidoGenerico;
@Output() regresarProductos = new EventEmitter<boolean>();
public env: string = environment.api_Url + "/imagen/";
  constructor() { }

  ngOnInit(): void {
  }

  irPedido(){
    this.regresarProductos.emit(false);
  }
}
