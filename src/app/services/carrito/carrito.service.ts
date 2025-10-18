import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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


  }
}
