import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IDetalleProducto } from 'src/app/models';
import { IProductoDTO } from 'src/app/productos/producto/models';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {

  public carritoDetalle = new BehaviorSubject<any[]>([]);
  carritoDetalle$ = this.carritoDetalle.asObservable();

  public carritoProducto = new BehaviorSubject<any[]>([]);
  carritoProducto$ = this.carritoProducto.asObservable();

  public carritoEliminarDetalle = new BehaviorSubject<any[]>([]);
  carritoEliminarDetalle$ = this.carritoEliminarDetalle.asObservable();


  constructor() {
    const guardado = localStorage.getItem('carritoDetalle');
    if (guardado) {
      this.carritoDetalle.next(JSON.parse(guardado));
    }

    this.carritoDetalle$.subscribe(detalle => {
      localStorage.setItem('carritoDetalle', JSON.stringify(detalle));
    });
  }

  agregarProducto(producto: IDetalleProducto) {
    const actual = this.carritoDetalle.getValue();
    const index = actual.findIndex(p => p.codigoBarras === producto.codigoBarras);

    if (index !== -1) {
      actual[index].cantidad += 1;
      actual[index].total = actual[index].cantidad * actual[index].precioVenta;
    } else {
      producto.cantidad = 1;
      producto.total = producto.precioVenta;
      actual.push(producto);
    }

    this.carritoDetalle.next([...actual]);
    console.log('Carrito actualizado:', actual);
  }

  eliminarProducto(producto: IDetalleProducto) {
    const actual = this.carritoDetalle.getValue();
    const index = actual.findIndex(p => p.codigoBarras === producto.codigoBarras);

    if (index !== -1) {
      if (actual[index].cantidad > 1) {
        actual[index].cantidad -= 1;
        actual[index].total = actual[index].cantidad * actual[index].precioVenta;
      } else {
        actual.splice(index, 1);
      }

      this.carritoDetalle.next([...actual]);
    }
  }

  limpiarCarrito() {
    this.carritoDetalle.next([]);
    localStorage.removeItem('carritoDetalle');
  }

  obtenerCarrito(): IDetalleProducto[] {
    return this.carritoDetalle.getValue();
  }


validarCarrito() {
  const guardado = localStorage.getItem('carritoDetalle');
  if (!guardado || guardado === '[]') {
    this.limpiarCarrito();
  }
}

}
