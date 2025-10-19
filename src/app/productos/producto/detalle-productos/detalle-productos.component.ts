import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { Component, OnInit } from '@angular/core';
import { IDetalleProducto } from 'src/app/models';

@Component({
  selector: 'app-detalle-productos',
  templateUrl: './detalle-productos.component.html',
  styleUrls: ['./detalle-productos.component.scss']
})
export class DetalleProductosComponent implements OnInit {

  detalleProducto: IDetalleProducto[] = [];
  totalProducto: number = 0;
  constructor(
    private readonly serviceCarrito: CarritoService
  ) { }

  ngOnInit(): void {
    this.serviceCarrito.carritoDetalle$.subscribe(carrito => {
      this.detalleProducto = carrito;
      this.totalProducto = this.detalleProducto.reduce((sum, prod) => {
        return sum + (prod.cantidad * prod.precioVenta);
      }, 0);

      console.log(this.detalleProducto, 'carrrrrr')
    });
  }

}
