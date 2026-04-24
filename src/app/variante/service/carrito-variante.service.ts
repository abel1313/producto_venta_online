import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IVarianteResumen } from '../models/variante.model';

const LS_KEY = 'carritoVariante';

@Injectable({ providedIn: 'root' })
export class CarritoVarianteService {

  private _carrito = new BehaviorSubject<IDetalleVariante[]>(this.leerStorage());
  carrito$ = this._carrito.asObservable();

  get total(): number {
    return this._carrito.getValue().reduce((s, i) => s + i.cantidad, 0);
  }

  agregar(v: IVarianteResumen): boolean {
    const actual = this._carrito.getValue();
    const idx = actual.findIndex(i => i.varianteId === v.id);

    if (idx !== -1) {
      if (actual[idx].cantidad >= (v.stock ?? 0)) return false;
      actual[idx].cantidad += 1;
      actual[idx].subTotal = actual[idx].cantidad * actual[idx].precio;
    } else {
      if ((v.stock ?? 0) <= 0) return false;
      const precio = v.precio ?? 0;
      actual.push({
        varianteId:   v.id,
        talla:        v.talla,
        color:        v.color,
        marca:        v.marca,
        presentacion: v.presentacion,
        stock:        v.stock ?? 0,
        precio,
        cantidad:     1,
        subTotal:     precio,
        imagenBase64: v.imagenBase64
      });
    }

    this.emitir([...actual]);
    return true;
  }

  eliminar(varianteId: number): void {
    const actual = this._carrito.getValue();
    const idx = actual.findIndex(i => i.varianteId === varianteId);
    if (idx === -1) return;

    if (actual[idx].cantidad > 1) {
      actual[idx].cantidad -= 1;
      actual[idx].subTotal = actual[idx].cantidad * actual[idx].precio;
    } else {
      actual.splice(idx, 1);
    }
    this.emitir([...actual]);
  }

  limpiar(): void {
    this.emitir([]);
  }

  obtener(): IDetalleVariante[] {
    return this._carrito.getValue();
  }

  estaEnCarrito(varianteId: number): boolean {
    return this._carrito.getValue().some(i => i.varianteId === varianteId);
  }

  cantidadEnCarrito(varianteId: number): number {
    return this._carrito.getValue().find(i => i.varianteId === varianteId)?.cantidad ?? 0;
  }

  private emitir(items: IDetalleVariante[]): void {
    this._carrito.next(items);
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }

  private leerStorage(): IDetalleVariante[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    } catch { return []; }
  }
}
