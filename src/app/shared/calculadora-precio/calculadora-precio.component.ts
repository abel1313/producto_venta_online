import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CampanasService } from 'src/app/campanas/campanas.service';
import { FletesService, IReporteViaje, IViaje } from '../../fletes/fletes.service';
import { aDos, costoTotal, escenarios, gananciaYMargen, IEscenarioPrecio, precioConGananciaMinima, precioConMargen, recargoSobreCosto, redondearA, transportePorPieza } from './calculo-precio';
import { CalculoPrecioService, ICalculoParaGuardar, IComisionTerminal } from './calculo-precio.service';

/** Lo que la calculadora entrega al formulario al pulsar «Usar este precio». */
export interface IResultadoCalculo {
  /** El precio que el dueño va a cobrar (puede ser distinto del calculado). */
  precio: number;
  /** Si dejó marcado poner también el costo total (compra + transporte + otros) en «Precio de compra». */
  actualizarCosto: boolean;
  costoTotal: number;
  /** Lo que se guarda en el historial del producto después de guardarlo. */
  calculo: ICalculoParaGuardar;
  /** Solo si el flete que se usó en el cálculo es distinto al del viaje vigente del producto: al guardar se le pregunta al dueño si lo actualiza también en el viaje. */
  viaje?: { viajeId: number; nombre: string; fleteActual: number; fleteNuevo: number };
}

/**
 * «Calcular precio» de un producto (Nuevo producto / Actualizar producto): ayuda para decidir el precio de venta a partir de lo que costó.
 * SOLO calcula: el precio del producto no cambia hasta que se pulsa «Usar este precio» (que emite `usar`); «Cerrar» no cambia nada.
 * Todo es por UNA pieza. Las fórmulas están en `calculo-precio.ts`.
 * La comisión de tarjeta se elige del catálogo de terminal que ya usa el cobro; el precio de campaña se toma de la campaña vigente.
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
  /** El producto que se edita (null en Nuevo producto): sirve para buscar su precio en la campaña vigente. */
  @Input() productoId: number | null = null;
  /** El dueño eligió «Usar este precio»: el padre lo escribe en «Precio de venta» (y, si se pidió, en «Precio de compra»). */
  @Output() usar = new EventEmitter<IResultadoCalculo>();

  compra: number | null = null;
  transporte: number | null = null;
  otros: number | null = null;
  /** Ayuda opcional para sacar el transporte por pieza: gasto total del viaje ÷ piezas que se trajeron (de TODOS los juguetes del viaje). */
  gastoViaje: number | null = null;
  piezasViaje: number | null = null;
  margen: number | null = 30;
  readonly margenesRapidos = [20, 25, 30, 35];
  /** Redondeo comercial: $1, $5 o $10 más cercano. */
  paso = 5;
  readonly pasos = [1, 5, 10];
  /** Comisiones de terminal ya dadas de alta (se cargan al abrir); `comisionId` null = sin comisión (efectivo o transferencia). */
  comisiones: IComisionTerminal[] = [];
  comisionId: number | null = null;
  /** Lo mínimo en pesos que quieres ganar por pieza, aunque el % salga chico. Opcional. */
  gananciaMin: number | null = null;
  /** Precio que viste en otras tiendas (lo escribe el dueño; la app no busca en internet). Opcional. */
  precioMercado: number | null = null;
  /** Precio de este producto en la campaña vigente (null si no hay campaña o el producto no está). Solo lectura. */
  precioCampana: number | null = null;
  nombreCampana: string | null = null;
  /** Poner también el costo total real en «Precio de compra» para que los reportes cuenten el transporte. */
  actualizarCosto = true;
  /** Precio que el dueño decidió cobrar (null = el redondeado sugerido). */
  private elegido: number | null = null;

  /** Los viajes de compra en los que llegó este producto (con su flete ya registrado). Sirve para avisar antes de contar el flete dos veces. */
  viajesDelProducto: IViaje[] = [];
  /**
   * El viaje que se está vendiendo ahora (el más viejo que todavía tiene piezas de este producto por vender; si ya no queda ninguna, el más reciente).
   * Su flete por pieza es el que se pone solo en «Transporte por pieza»: así el viaje y el cálculo parten del mismo número.
   */
  viajeVigente: IViaje | null = null;
  /** El nombre del viaje del que se tomó el transporte que está puesto (null si lo escribió el dueño). */
  transporteTomadoDe: string | null = null;

  constructor(private readonly calculos: CalculoPrecioService, private readonly campanas: CampanasService, private readonly fletes: FletesService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['visible'] && this.visible) {
      this.compra = this.costoInicial && this.costoInicial > 0 ? this.costoInicial : null;
      this.transporte = null; this.otros = null; this.gastoViaje = null; this.piezasViaje = null; this.transporteTomadoDe = null;
      this.margen = 30; this.paso = 5; this.elegido = null;
      this.comisionId = null; this.gananciaMin = null; this.precioMercado = null; this.actualizarCosto = true;
      this.cargarCatalogos();
    }
  }

  /** Lee las comisiones de terminal y, si el producto ya existe, su precio de campaña. Si algo no se puede leer, esa parte simplemente no aparece. */
  private cargarCatalogos(): void {
    this.calculos.comisiones().subscribe(l => this.comisiones = l);
    this.precioCampana = null; this.nombreCampana = null; this.viajesDelProducto = [];
    const id = this.productoId;
    if (!id) return;
    // Si el producto ya tiene su flete en un viaje de compra, «poner el costo total» (que incluye el flete) lo contaría dos veces: se desmarca solo y se avisa.
    this.viajeVigente = null;
    this.fletes.deProducto(id).subscribe(v => {
      this.viajesDelProducto = v;
      if (!v.length) return;
      this.actualizarCosto = false;
      // Qué viaje se está vendiendo ahora: se ven las piezas que le quedan a este producto en cada uno.
      this.fletes.reportes().pipe(catchError(() => of([] as IReporteViaje[]))).subscribe(rs => {
        this.viajeVigente = this.elegirViajeVigente(v, rs);
        this.ponerFleteDelViaje();
      });
    });
    this.campanas.activa().subscribe(c => {
      const p = c?.productos?.find(x => x.productoId === id);
      this.precioCampana = p ? +p.precio : null;
      this.nombreCampana = p && c ? c.nombre : null;
    });
  }

  /** El viaje vigente: el más viejo con piezas de este producto por vender; si ninguno tiene, el más reciente. */
  private elegirViajeVigente(viajes: IViaje[], reportes: IReporteViaje[]): IViaje | null {
    const id = this.productoId;
    const restantes = (v: IViaje) => reportes.find(r => r.viajeId === v.id)?.renglones.find(x => x.productoId === id)?.piezasRestantes ?? 0;
    const porFecha = (a: IViaje, b: IViaje) => (a.fecha ?? '').localeCompare(b.fecha ?? '') || (a.id ?? 0) - (b.id ?? 0);
    const conPiezas = viajes.filter(v => restantes(v) > 0).sort(porFecha);
    if (conPiezas.length) return conPiezas[0];
    return [...viajes].sort(porFecha).pop() ?? null;
  }

  /** Pone en «Transporte por pieza» el flete del viaje vigente, SOLO si el dueño todavía no escribió nada (nunca pisa lo que ya puso). */
  private ponerFleteDelViaje(): void {
    const v = this.viajeVigente;
    if (!v || (this.transporte != null && this.transporte !== 0)) return;
    const f = this.fleteDelViaje(v);
    if (f > 0) { this.transporte = f; this.transporteTomadoDe = v.nombre; this.alCambiarCalculo(); }
  }

  /** El flete por pieza del viaje vigente (null si no hay). */
  get fleteVigente(): number | null { return this.viajeVigente ? this.fleteDelViaje(this.viajeVigente) : null; }

  /** El transporte puesto aquí es distinto al del viaje vigente: se avisa (no se bloquea nada). */
  get difiereDelViaje(): boolean {
    const f = this.fleteVigente;
    return f != null && f > 0 && (this.transporte || 0) > 0 && Math.abs((this.transporte || 0) - f) > 0.004;
  }

  /** El dueño escribió el transporte a mano: ya no es «tomado del viaje». */
  alEscribirTransporte(): void { this.transporteTomadoDe = null; this.alCambiarCalculo(); }

  /** El texto con los viajes del producto y su flete por pieza, para el aviso («Juguetes Reyes 1: $20.00 por pieza»). */
  get viajesTexto(): string {
    const fmt = (n: number) => '$' + (+n || 0).toFixed(2);
    return this.viajesDelProducto
      .map(v => `«${v.nombre}» (${fmt(v.productos.find(p => p.productoId === this.productoId)?.fletePorPieza ?? 0)} de flete por pieza)`)
      .join(', ');
  }

  /** Va a duplicar el flete: el producto ya lo tiene en un viaje y aquí se está poniendo también (como transporte o en el costo total que se guarda). */
  get duplicaFlete(): boolean {
    // El transporte de aquí solo sirve para calcular el precio y NO se guarda en el costo; lo que duplica el flete es «Poner también el costo total».
    return this.viajesDelProducto.length > 0 && this.actualizarCosto && this.costoCambia;
  }

  /** El flete por pieza que este producto lleva en un viaje (0 si no está). */
  fleteDelViaje(v: IViaje): number { return v.productos.find(p => p.productoId === this.productoId)?.fletePorPieza ?? 0; }

  /** Usa el flete por pieza de un viaje como «Transporte por pieza» (solo para calcular el precio; no cambia el costo guardado ni el viaje). */
  usarFleteDeViaje(v: IViaje): void {
    this.transporte = this.fleteDelViaje(v) || null;
    this.transporteTomadoDe = this.transporte ? v.nombre : null;
    this.alCambiarCalculo();
  }

  /** Comisión elegida (% del precio): tarifa + IVA de la terminal. 0 si es sin comisión. */
  get comisionPct(): number { return this.comisiones.find(x => x.pagosYMesesId === this.comisionId)?.totalPct ?? 0; }
  get comisionDescripcion(): string | null { return this.comisiones.find(x => x.pagosYMesesId === this.comisionId)?.descripcion ?? null; }

  get costo(): number { return costoTotal(this.compra, this.transporte, this.otros); }
  get transporteSugerido(): number { return transportePorPieza(this.gastoViaje, this.piezasViaje); }
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
  /** Hay algo distinto entre el costo total y el precio de compra (transporte u otros gastos): tiene sentido ofrecer actualizarlo. */
  get costoCambia(): boolean { return this.costo > 0 && Math.abs(this.costo - (this.compra && this.compra > 0 ? this.compra : 0)) > 0.005; }

  get precio(): number | null { return this.elegido ?? this.sugerido; }
  set precio(v: number | null) { this.elegido = v != null && v > 0 ? aDos(v) : null; }

  get resultado(): { ganancia: number; margenPct: number } | null {
    const p = this.precio;
    return p && this.costo > 0 ? gananciaYMargen(p, this.costo, this.comisionPct) : null;
  }
  /** Cobrar de manera que la ganancia limpia sea negativa: se pierde dinero por pieza. */
  get pierde(): boolean { const r = this.resultado; return !!r && r.ganancia < -0.005; }

  usarTransporteSugerido(): void { this.transporte = this.transporteSugerido || null; }
  elegirMargen(m: number): void { this.margen = m; this.elegido = null; }
  elegirEscenario(e: IEscenarioPrecio): void { this.margen = e.margenPct; this.elegido = e.redondeado; }
  alCambiarCalculo(): void { this.elegido = null; }

  usarPrecio(): void {
    const p = this.precio;
    if (!p || p <= 0 || !(this.compra && this.compra > 0)) return;
    this.usar.emit({
      precio: p,
      actualizarCosto: this.actualizarCosto && this.costoCambia,
      costoTotal: this.costo,
      calculo: {
        costoCompra: this.compra, transporte: this.transporte || 0, otros: this.otros || 0,
        comisionPct: this.comisionPct, comisionDescripcion: this.comisionDescripcion,
        margenPct: this.margen ?? 0, precioCalculado: this.sugerido ?? p, precioCobrado: p,
        actualizoPrecioCompra: this.actualizarCosto && this.costoCambia
      },
      viaje: this.difiereDelViaje && this.viajeVigente?.id != null
        ? { viajeId: this.viajeVigente.id, nombre: this.viajeVigente.nombre, fleteActual: this.fleteVigente ?? 0, fleteNuevo: this.transporte || 0 }
        : undefined
    });
    this.cerrar();
  }

  cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
