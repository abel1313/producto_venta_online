import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IDetalleVariante } from '../models/detalle-variante.model';
import { IVarianteResumen } from '../models/variante.model';
import { IItemPromoCarrito, IPromocion } from 'src/app/promociones/models/promocion.model';

const LS_KEY = 'carritoVariante';

@Injectable({ providedIn: 'root' })
export class CarritoVarianteService {

  // ── Variantes (con localStorage) ────────────────────────────────────
  private _carrito = new BehaviorSubject<IDetalleVariante[]>(this.leerStorage());
  carrito$ = this._carrito.asObservable();

  // ── Promociones (solo en memoria — sin localStorage) ─────────────────
  private _promos = new BehaviorSubject<IItemPromoCarrito[]>([]);
  promos$ = this._promos.asObservable();

  // ── Total combinado (variantes + combos) ─────────────────────────────
  get total(): number {
    const v = this._carrito.getValue().reduce((s, i) => s + i.cantidad, 0);
    const p = this._promos.getValue().reduce((s, i) => s + i.cantidadCombos, 0);
    return v + p;
  }

  // ── Variantes ─────────────────────────────────────────────────────────

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
        imagenBase64: v.imagenBase64,
        imagenUrl:    v.imagenUrl
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

  obtener(): IDetalleVariante[] {
    return this._carrito.getValue();
  }

  estaEnCarrito(varianteId: number): boolean {
    return this._carrito.getValue().some(i => i.varianteId === varianteId);
  }

  cantidadEnCarrito(varianteId: number): number {
    return this._carrito.getValue().find(i => i.varianteId === varianteId)?.cantidad ?? 0;
  }

  // ── Promociones ───────────────────────────────────────────────────────

  agregarPromo(promo: IPromocion, cantidad: number): void {
    const actual = this._promos.getValue();
    const idx = actual.findIndex(p => p.promocionId === promo.id);
    const precioTotal = promo.detalles.reduce((s, d) => s + d.precioEnPromocion * d.cantidad, 0);

    if (idx !== -1) {
      const nuevaCantidad = actual[idx].cantidadCombos + cantidad;
      const limite = promo.instanciasDisponibles ?? 999;
      actual[idx].cantidadCombos = Math.min(nuevaCantidad, limite);
    } else {
      actual.push({
        promocionId:            promo.id,
        descripcion:            promo.descripcion,
        cantidadCombos:         Math.min(cantidad, promo.instanciasDisponibles ?? 999),
        instanciasDisponibles:  promo.instanciasDisponibles ?? 0,
        precioTotal,
        detalles:               promo.detalles
      });
    }
    this._promos.next([...actual]);
  }

  eliminarPromo(promocionId: number): void {
    const actual = this._promos.getValue();
    const idx = actual.findIndex(p => p.promocionId === promocionId);
    if (idx === -1) return;

    if (actual[idx].cantidadCombos > 1) {
      actual[idx].cantidadCombos -= 1;
    } else {
      actual.splice(idx, 1);
    }
    this._promos.next([...actual]);
  }

  quitarPromo(promocionId: number): void {
    this._promos.next(this._promos.getValue().filter(p => p.promocionId !== promocionId));
  }

  obtenerPromos(): IItemPromoCarrito[] {
    return this._promos.getValue();
  }

  tienePromos(): boolean {
    return this._promos.getValue().length > 0;
  }

  cantidadPromoEnCarrito(promocionId: number): number {
    return this._promos.getValue().find(p => p.promocionId === promocionId)?.cantidadCombos ?? 0;
  }

  limpiarPromos(): void {
    this._promos.next([]);
  }

  // ── Global ────────────────────────────────────────────────────────────

  limpiar(): void {
    this._carrito.next([]);
    localStorage.removeItem(LS_KEY);
    this._promos.next([]);
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
