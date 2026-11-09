import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { aDos, costoTotal, escenarios, gananciaYMargen, IEscenarioPrecio, mermaPorPieza, precioConGananciaMinima, precioConMargen, recargoSobreCosto, redondearA, transportePorPieza, transportePorValor } from './calculo-precio';

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
  /** Otra forma de repartir el viaje: por valor (lo que costó todo el viaje de mercancía). Una pieza cara carga más transporte que una barata. */
  repartoViaje: 'piezas' | 'valor' = 'piezas';
  valorViaje: number | null = null;
  /** v2: % de la compra que se calcula que se daña o no se vende (merma) y % que se queda la terminal de tarjeta (sobre el precio). Opcionales. */
  mermaPct: number | null = null;
  comisionPct: number | null = null;
  /** v2: lo mínimo en pesos que quieres ganar por pieza, aunque el % salga chico (en un juguete de $50 el 30 % son solo $15). Opcional. */
  gananciaMin: number | null = null;
  /** v2: precio que viste en otras tiendas (lo captura el dueño; la app no busca en internet) y precio de campaña para el cliente recurrente. Opcionales. */
  precioMercado: number | null = null;
  precioCampana: number | null = null;
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
      this.transporte = null; this.otros = null; this.gastoViaje = null; this.piezasViaje = null; this.valorViaje = null; this.repartoViaje = 'piezas';
      this.mermaPct = null; this.comisionPct = null; this.gananciaMin = null; this.precioMercado = null; this.precioCampana = null;
      this.margen = 30; this.paso = 5; this.elegido = null;
    }
  }

  /** Otros gastos + merma (la merma sale del costo de compra). */
  get merma(): number { return mermaPorPieza(this.compra, this.mermaPct); }
  get costo(): number { return costoTotal(this.compra, this.transporte, (this.otros && this.otros > 0 ? this.otros : 0) + this.merma); }
  get transporteSugerido(): number {
    return this.repartoViaje === 'valor' ? transportePorValor(this.gastoViaje, this.valorViaje, this.compra) : transportePorPieza(this.gastoViaje, this.piezasViaje);
  }
  get exacto(): number | null { return precioConMargen(this.costo, this.margen, this.comisionPct); }
  get sugerido(): number | null { return this.exacto == null ? null : redondearA(this.exacto, this.paso); }
  get tabla(): IEscenarioPrecio[] { return escenarios(this.costo, this.paso, undefined, this.comisionPct); }
  /** 30 % de margen = 42.86 % de recargo sobre el costo: se muestra para no confundir margen con «subirle un %». */
  get recargo(): number | null { return recargoSobreCosto(this.margen); }
  /** Precio más bajo que todavía deja tu ganancia mínima en pesos. */
  get precioMinimoGanancia(): number | null { return this.gananciaMin && this.gananciaMin > 0 ? precioConGananciaMinima(this.costo, this.gananciaMin, this.comisionPct) : null; }
  /** El precio elegido deja menos que la ganancia mínima que pediste. */
  get bajoMinimo(): boolean { const r = this.resultado; return !!r && !this.pierde && !!this.gananciaMin && this.gananciaMin > 0 && r.ganancia < this.gananciaMin - 0.005; }
  /** Ganancia y margen si vendes al precio del mercado, para ver si te conviene igualarlo. */
  get alMercado(): { ganancia: number; margenPct: number } | null {
    return this.precioMercado && this.precioMercado > 0 && this.costo > 0 ? gananciaYMargen(this.precioMercado, this.costo, this.comisionPct) : null;
  }
  /** Ganancia y margen con el precio de campaña (cliente recurrente): debe dejar ganancia también. */
  get enCampana(): { ganancia: number; margenPct: number } | null {
    return this.precioCampana && this.precioCampana > 0 && this.costo > 0 ? gananciaYMargen(this.precioCampana, this.costo, this.comisionPct) : null;
  }

  get precio(): number | null { return this.elegido ?? this.sugerido; }
  set precio(v: number | null) { this.elegido = v != null && v > 0 ? aDos(v) : null; }

  get resultado(): { ganancia: number; margenPct: number } | null {
    const p = this.precio;
    return p && this.costo > 0 ? gananciaYMargen(p, this.costo, this.comisionPct) : null;
  }
  /** Cobrar menos de lo que cuesta: se pierde dinero por pieza. */
  get pierde(): boolean { const r = this.resultado; return !!r && r.ganancia < -0.005; }

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
