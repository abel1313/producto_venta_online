import { Component, ElementRef, forwardRef, HostListener, Input, OnChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition } from '@angular/cdk/overlay';

interface ICelda {
  dia:        number;
  iso:        string;   // yyyy-MM-dd
  otroMes:    boolean;
  deshabilitado: boolean;
  hoy:        boolean;
  seleccionado: boolean;
}

/**
 * Calendario propio, en la línea visual del design system (.pk-*).
 *
 * Existe porque `<input type="date">` se ve distinto en cada navegador (y en Android es
 * un cuadrito gris diminuto), y porque meter el datepicker de Angular Material aquí
 * arrastraría el tema indigo-pink dentro de una pantalla .pk-* -- se vería pegado.
 *
 * Habla el mismo idioma que `<input type="date">`: el valor es un string `yyyy-MM-dd`,
 * así que se puede cambiar uno por otro sin tocar el componente que lo usa.
 *
 * ⚠️ Todo el manejo de fechas es LOCAL a propósito: `new Date('2026-09-09')` se parsea
 * como UTC y en México (UTC-6) regresa el día 8. Por eso nunca se construye un Date a
 * partir del string completo -- siempre `new Date(anio, mes, dia)`.
 */
@Component({
  selector: 'app-selector-fecha',
  templateUrl: './selector-fecha.component.html',
  styleUrls: ['./selector-fecha.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectorFechaComponent),
    multi: true
  }]
})
export class SelectorFechaComponent implements ControlValueAccessor, OnChanges {

  /** Límites inclusivos en formato yyyy-MM-dd. Vacío = sin límite. */
  @Input() min = '';
  @Input() max = '';
  @Input() placeholder = 'Selecciona una fecha';
  @Input() disabled = false;
  /** Texto chico bajo el campo, para el caso "fuera de este rango no se acepta". */
  @Input() ayuda = '';

  abierto = false;
  valor = '';

  mesVista  = new Date().getMonth();
  anioVista = new Date().getFullYear();

  /**
   * ⚠️ Las celdas son un CAMPO, no un getter, y el *ngFor las sigue por `iso`.
   *
   * Siendo getter, cada ciclo de change detection devolvía 42 objetos nuevos; el *ngFor
   * los veía como otros (los rastrea por identidad) y destruía y volvía a crear los 42
   * botones. Si en la app algo dispara change detection seguido -- polling de pedidos,
   * el countdown del chatbot -- el botón donde cayó el `mousedown` ya no existe para el
   * `mouseup`, y el navegador entonces NO emite `click`: el calendario se veía bien pero
   * no dejaba elegir ningún día. Recalcular solo al cambiar mes/valor/límites arregla eso
   * y de paso deja de rehacer 42 nodos por ciclo.
   */
  celdas: ICelda[] = [];

  /**
   * Orden de preferencia del popover: pegado abajo-izquierda del campo y, si no cabe,
   * arriba; las dos últimas alinean por la derecha para los campos que quedan al borde
   * de la pantalla. El CDK toma la primera que entre completa en el viewport.
   */
  readonly posiciones: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top',    offsetY:  6 },
    { originX: 'start', originY: 'top',    overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top',    offsetY:  6 },
    { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom', offsetY: -6 }
  ];

  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly host: ElementRef<HTMLElement>) {
    this.recalcular();
  }

  // `min` y `max` vienen atados a otro campo (el "hasta" se limita con el "desde"),
  // así que cambian solos y hay que rehacer la rejilla cuando pasa.
  ngOnChanges(): void { this.recalcular(); }

  // ── ControlValueAccessor ───────────────────────────────────────────

  writeValue(v: string | null): void {
    this.valor = v ?? '';
    this.posicionarVistaEnValor();
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  // ── Apertura / cierre ──────────────────────────────────────────────

  alternar(): void {
    if (this.disabled) return;
    this.abierto = !this.abierto;
    if (this.abierto) this.posicionarVistaEnValor();
    else this.onTouched();
  }

  // Cerrar al dar clic fuera: si no, quedan varios calendarios abiertos encimados
  // cuando la pantalla tiene más de un campo de fecha (desde/hasta).
  // Los clics sobre el propio campo se ignoran aquí porque ya los atiende `alternar()`:
  // si no, el mismo clic cerraría y volvería a abrir el calendario.
  cerrarPorFuera(evento: MouseEvent): void {
    if (this.host.nativeElement.contains(evento.target as Node)) return;
    this.abierto = false;
    this.onTouched();
  }

  @HostListener('document:keydown.escape')
  escape(): void { this.abierto = false; }

  // ── Navegación de mes ──────────────────────────────────────────────

  mesAnterior(): void {
    if (this.mesVista === 0) { this.mesVista = 11; this.anioVista--; }
    else this.mesVista--;
    this.recalcular();
  }

  mesSiguiente(): void {
    if (this.mesVista === 11) { this.mesVista = 0; this.anioVista++; }
    else this.mesVista++;
    this.recalcular();
  }

  get tituloMes(): string { return `${this.nombresMes[this.mesVista]} ${this.anioVista}`; }

  // ── Rejilla ────────────────────────────────────────────────────────

  private recalcular(): void {
    const primero = new Date(this.anioVista, this.mesVista, 1);
    // getDay() manda 0=domingo; la semana aquí arranca en lunes.
    const desfase = (primero.getDay() + 6) % 7;
    const inicio = new Date(this.anioVista, this.mesVista, 1 - desfase);
    const hoyIso = this.aIso(new Date());

    this.celdas = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const iso = this.aIso(d);
      return {
        dia: d.getDate(),
        iso,
        otroMes: d.getMonth() !== this.mesVista,
        deshabilitado: this.fueraDeRango(iso),
        hoy: iso === hoyIso,
        seleccionado: iso === this.valor
      };
    });
  }

  /** Los 42 días de la rejilla son únicos, así que el iso sirve de identidad estable. */
  porIso(_: number, celda: ICelda): string { return celda.iso; }

  elegir(celda: ICelda): void {
    if (celda.deshabilitado) return;
    this.valor = celda.iso;
    this.onChange(this.valor);
    this.onTouched();
    this.abierto = false;
    this.recalcular();
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesVista = hoy.getMonth();
    this.anioVista = hoy.getFullYear();
    this.recalcular();
    const iso = this.aIso(hoy);
    if (!this.fueraDeRango(iso)) this.elegir({ ...this.celdaVacia, iso });
  }

  limpiar(): void {
    this.valor = '';
    this.onChange('');
    this.abierto = false;
    this.recalcular();
  }

  // ── Etiqueta visible ───────────────────────────────────────────────

  get etiqueta(): string {
    if (!this.valor) return '';
    const d = this.desdeIso(this.valor);
    if (!d) return this.valor;
    return `${d.getDate()} de ${this.nombresMes[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  }

  // ── Utilidades de fecha (siempre en local) ─────────────────────────

  private readonly celdaVacia: ICelda = {
    dia: 0, iso: '', otroMes: false, deshabilitado: false, hoy: false, seleccionado: false
  };

  private fueraDeRango(iso: string): boolean {
    if (this.min && iso < this.min) return true;
    if (this.max && iso > this.max) return true;
    return false;
  }

  private aIso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private desdeIso(iso: string): Date | null {
    const partes = iso.split('-').map(Number);
    if (partes.length !== 3 || partes.some(isNaN)) return null;
    return new Date(partes[0], partes[1] - 1, partes[2]);
  }

  private posicionarVistaEnValor(): void {
    const d = this.desdeIso(this.valor) ?? this.primerMesUtil();
    this.mesVista = d.getMonth();
    this.anioVista = d.getFullYear();
    this.recalcular();
  }

  /**
   * Sin fecha elegida el calendario abría siempre en el mes de hoy, y con un `min` de otro
   * mes (el "hasta" limitado por el "desde") eso mostraba los 30 días tachados: parecía que
   * el calendario no dejaba elegir nada. Si hoy cae fuera del rango, se abre en el límite.
   */
  private primerMesUtil(): Date {
    const hoy = new Date();
    const hoyIso = this.aIso(hoy);
    if (this.min && hoyIso < this.min) return this.desdeIso(this.min) ?? hoy;
    if (this.max && hoyIso > this.max) return this.desdeIso(this.max) ?? hoy;
    return hoy;
  }
}
