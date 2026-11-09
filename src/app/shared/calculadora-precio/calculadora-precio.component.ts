import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { aDos, costoTotal, escenarios, gananciaYMargen, IEscenarioPrecio, precioConMargen, redondearA, transportePorPieza } from './calculo-precio';

/**
 * «Calcular precio» de un producto (Nuevo producto / Actualizar producto): ayuda para decidir el precio de venta a partir de lo que costó.
 * SOLO calcula: el precio del producto no cambia hasta que se pulsa «Usar este precio» (que emite `usar`); «Cerrar» no cambia nada.
 * Todo es por UNA pieza. Las fórmulas están en `calculo-precio.ts`.
 */
@Component({
  selector: 'app-calculadora-precio',
  templateUrl: './calculadora-precio.component.html',
  styleUrls: ['./calculadora-precio.component.scss']
})
export class CalculadoraPrecioComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  /** El «Precio de compra» que ya tiene el formulario: precarga el costo de compra. */
  @Input() costoInicial: number | null = null;
  /** El «Precio de venta» que ya tiene el formulario (solo para mostrarlo como referencia). */
  @Input() precioActual: number | null = null;
  /** El dueño eligió «Usar este precio»: el padre lo escribe en «Precio de venta». */
  @Output() usar = new EventEmitter<number>();

  compra: number | null = null;
  transporte: number | null = null;
  otros: number | null = null;
  /** Ayuda opcional para sacar el transporte por pieza: gasto total del viaje ÷ piezas que se trajeron. */
  gastoViaje: number | null = null;
  piezasViaje: number | null = null;
  margen: number | null = 30;
  readonly margenesRapidos = [20, 25, 30, 35];
  /** Redondeo comercial: $1, $5 o $10 más cercano. */
  paso = 5;
  readonly pasos = [1, 5, 10];
  /** Precio que el dueño decidió cobrar (null = el redondeado sugerido). */
  private elegido: number | null = null;

  ngOnChanges(c: SimpleChanges): void {
    if (c['visible'] && this.visible) {
      this.compra = this.costoInicial && this.costoInicial > 0 ? this.costoInicial : null;
      this.transporte = null; this.otros = null; this.gastoViaje = null; this.piezasViaje = null;
      this.margen = 30; this.paso = 5; this.elegido = null;
    }
  }

  get costo(): number { return costoTotal(this.compra, this.transporte, this.otros); }
  get transporteSugerido(): number { return transportePorPieza(this.gastoViaje, this.piezasViaje); }
  get exacto(): number | null { return precioConMargen(this.costo, this.margen); }
  get sugerido(): number | null { return this.exacto == null ? null : redondearA(this.exacto, this.paso); }
  get tabla(): IEscenarioPrecio[] { return escenarios(this.costo, this.paso); }

  get precio(): number | null { return this.elegido ?? this.sugerido; }
  set precio(v: number | null) { this.elegido = v != null && v > 0 ? aDos(v) : null; }

  get resultado(): { ganancia: number; margenPct: number } | null {
    const p = this.precio;
    return p && this.costo > 0 ? gananciaYMargen(p, this.costo) : null;
  }
  /** Cobrar menos de lo que cuesta: se pierde dinero por pieza. */
  get pierde(): boolean { const p = this.precio; return !!p && this.costo > 0 && p < this.costo - 0.005; }

  usarTransporteSugerido(): void { this.transporte = this.transporteSugerido || null; }
  elegirMargen(m: number): void { this.margen = m; this.elegido = null; }
  elegirEscenario(e: IEscenarioPrecio): void { this.margen = e.margenPct; this.elegido = e.redondeado; }
  alCambiarCalculo(): void { this.elegido = null; }

  usarPrecio(): void {
    const p = this.precio;
    if (!p || p <= 0) return;
    this.usar.emit(p);
    this.cerrar();
  }

  cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
