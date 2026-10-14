import { Component, ElementRef, forwardRef, HostBinding, HostListener, Input, OnChanges, ViewChild } from '@angular/core';
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

/** Qué se ve dentro del calendario: los días de un mes, los 12 meses o la lista de años. */
type Vista = 'dias' | 'meses' | 'anios';

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
 * Mes y año se eligen directo (QA 2026-10-14): tocando el nombre del mes sale la rejilla de
 * los 12 meses, y tocando el año sale la lista de años. Antes solo había flechas de un mes en
 * un mes, y para una fecha de nacimiento de 1980 había que dar más de 500 clics.
 * Con `modo="nacimiento"` además abre directo en los años, no deja fechas futuras y se puede
 * escribir la fecha (dd/mm/aaaa).
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

  /**
   * `nacimiento`: abre en la lista de años (si no hay fecha), no deja elegir fechas futuras ni
   * antes de 1900 (salvo que se pase otro `min`/`max`) y deja escribir la fecha a mano.
   */
  @Input() modo: 'normal' | 'nacimiento' = 'normal';

  /**
   * El campo se dibuja sin borde, sin fondo y heredando el color del padre.
   *
   * Es para cuando el calendario vive DENTRO de otro control que ya pone su propia
   * caja -- los pills "Creado desde / Creado hasta" de tienda/buscar y
   * productos/buscar. Con el estilo normal quedaba caja dentro de caja: el pill con
   * su borde redondeado y, pegado adentro, el campo con el suyo.
   *
   * Tambien cambia la fecha a dd/mm/aaaa: es el mismo caso de "voy dentro de algo
   * compacto", y la version larga no cabe en el pill (ver `etiqueta`).
   */
  @Input() plano = false;

  @HostBinding('class.sf-plano') get clasePlano(): boolean { return this.plano; }

  /** La lista de años, para centrar el año activo al abrirla. */
  @ViewChild('listaAnios') listaAnios?: ElementRef<HTMLElement>;

  abierto = false;
  valor = '';
  vista: Vista = 'dias';

  mesVista  = new Date().getMonth();
  anioVista = new Date().getFullYear();

  /** Lo que se escribe a mano en modo nacimiento (dd/mm/aaaa) y su aviso si no es válida. */
  textoEscrito = '';
  errorEscrito = '';

  /**
   * ⚠️ Las celdas son un CAMPO, no un getter, y el *ngFor las sigue por `iso`.
   *
   * Siendo getter, cada ciclo de change detection devolvía 42 objetos nuevos; el *ngFor
   * los veía como otros (los rastrea por identidad) y destruía y volvía a crear los 42
   * botones. Si en la app algo dispara change detection seguido -- polling de pedidos,
   * el countdown del chatbot -- el botón donde cayó el `mousedown` ya no existe para el
   * `mouseup`, y el navegador entonces NO emite `click`: el calendario se veía bien pero
   * no dejaba elegir ningún día. Recalcular solo al cambiar mes/valor/límites arregla eso
   * y de paso deja de rehacer 42 nodos por ciclo. Lo mismo para los años.
   */
  celdas: ICelda[] = [];
  anios: number[] = [];

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
  readonly mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  readonly numerosMes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly host: ElementRef<HTMLElement>) {
    this.recalcular();
  }

  // `min` y `max` vienen atados a otro campo (el "hasta" se limita con el "desde"),
  // así que cambian solos y hay que rehacer la rejilla cuando pasa.
  ngOnChanges(): void { this.recalcular(); }

  get esNacimiento(): boolean { return this.modo === 'nacimiento'; }

  /** Límites que de verdad se aplican: los que pasa la pantalla o, en nacimiento, 1900 → hoy. */
  get minEfectivo(): string { return this.min || (this.esNacimiento ? '1900-01-01' : ''); }
  get maxEfectivo(): string { return this.max || (this.esNacimiento ? this.aIso(new Date()) : ''); }

  // ── ControlValueAccessor ───────────────────────────────────────────

  writeValue(v: string | Date | null): void {
    // Si una pantalla le pasa un Date en vez de texto, se convierte aqui: con un Date el
    // `split` de desdeIso() tronaba en cada ciclo y dejaba la pantalla congelada con el
    // spinner arriba (paso en Mis datos, hotfix 2026-10-06).
    if (v instanceof Date) {
      this.valor = isNaN(v.getTime()) ? '' : this.aIso(v);
    } else {
      this.valor = typeof v === 'string' ? v : '';
    }
    this.posicionarVistaEnValor();
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  // ── Apertura / cierre ──────────────────────────────────────────────

  alternar(): void {
    if (this.disabled) return;
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.posicionarVistaEnValor();
      this.textoEscrito = this.valor ? this.aTextoCorto(this.valor) : '';
      this.errorEscrito = '';
      // Fecha de nacimiento sin elegir: lo primero es el año, no el mes de hoy.
      if (this.esNacimiento && !this.valor) {
        this.anioVista = Math.max(new Date().getFullYear() - 30, this.anioMinimo);
        this.verAnios();
      } else {
        this.vista = 'dias';
      }
    } else {
      this.onTouched();
    }
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

  // ── Navegación: flechas ────────────────────────────────────────────

  /** En días mueve un mes; en meses mueve un año. */
  anterior(): void {
    if (this.vista === 'meses') { this.anioVista--; this.recalcular(); return; }
    if (this.mesVista === 0) { this.mesVista = 11; this.anioVista--; }
    else this.mesVista--;
    this.recalcular();
  }

  siguiente(): void {
    if (this.vista === 'meses') { this.anioVista++; this.recalcular(); return; }
    if (this.mesVista === 11) { this.mesVista = 0; this.anioVista++; }
    else this.mesVista++;
    this.recalcular();
  }

  // Se conservan con su nombre de antes: mueven un mes y regresan a la vista de días.
  mesAnterior(): void { this.vista = 'dias'; this.anterior(); }
  mesSiguiente(): void { this.vista = 'dias'; this.siguiente(); }

  get tituloMes(): string { return `${this.nombresMes[this.mesVista]} ${this.anioVista}`; }

  // ── Navegación: elegir mes y año directo ───────────────────────────

  verMeses(): void { this.vista = 'meses'; }

  verAnios(): void {
    this.vista = 'anios';
    // La lista se dibuja en el siguiente ciclo: ahí se centra el año activo.
    setTimeout(() => this.centrarAnioActivo());
  }

  elegirMes(mes: number): void {
    if (this.mesDeshabilitado(mes)) return;
    this.mesVista = mes;
    this.vista = 'dias';
    this.recalcular();
  }

  elegirAnio(anio: number): void {
    this.anioVista = anio;
    // Si el mes que estaba a la vista no cabe en ese año (por el rango), se va al primero que sí.
    if (this.mesDeshabilitado(this.mesVista)) {
      const primero = this.numerosMes.find(m => !this.mesDeshabilitado(m));
      this.mesVista = primero ?? 0;
    }
    this.vista = 'meses';
    this.recalcular();
  }

  /** Un mes está apagado si todos sus días quedan fuera del rango. */
  mesDeshabilitado(mes: number): boolean {
    const ultimo = new Date(this.anioVista, mes + 1, 0).getDate();
    const inicio = this.aIso(new Date(this.anioVista, mes, 1));
    const fin = this.aIso(new Date(this.anioVista, mes, ultimo));
    if (this.minEfectivo && fin < this.minEfectivo) return true;
    if (this.maxEfectivo && inicio > this.maxEfectivo) return true;
    return false;
  }

  esMesActual(mes: number): boolean {
    const hoy = new Date();
    return hoy.getFullYear() === this.anioVista && hoy.getMonth() === mes;
  }

  esMesElegido(mes: number): boolean {
    const d = this.desdeIso(this.valor);
    return !!d && d.getFullYear() === this.anioVista && d.getMonth() === mes;
  }

  esAnioElegido(anio: number): boolean {
    const d = this.desdeIso(this.valor);
    return !!d && d.getFullYear() === anio;
  }

  private get anioMinimo(): number {
    const d = this.desdeIso(this.minEfectivo);
    return d ? d.getFullYear() : new Date().getFullYear() - 100;
  }

  private get anioMaximo(): number {
    const d = this.desdeIso(this.maxEfectivo);
    return d ? d.getFullYear() : new Date().getFullYear() + 10;
  }

  private centrarAnioActivo(): void {
    const lista = this.listaAnios?.nativeElement;
    const activo = lista?.querySelector<HTMLElement>('.sf__anio--activo');
    if (!lista || !activo) return;
    lista.scrollTop = activo.offsetTop - lista.clientHeight / 2 + activo.clientHeight / 2;
  }

  porNumero(_: number, n: number): number { return n; }

  // ── Escribir la fecha (modo nacimiento) ────────────────────────────

  /** Deja solo dígitos y pone las diagonales solas: "15031985" → "15/03/1985". */
  alEscribir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 8);
    let texto = digitos;
    if (digitos.length > 4) texto = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
    else if (digitos.length > 2) texto = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    this.textoEscrito = texto;
    input.value = texto;
    this.errorEscrito = '';
    if (digitos.length === 8) this.confirmarEscrito();
  }

  confirmarEscrito(): void {
    const digitos = this.textoEscrito.replace(/\D/g, '');
    if (digitos.length !== 8) {
      this.errorEscrito = 'Escribe la fecha completa: día, mes y año (dd/mm/aaaa).';
      return;
    }
    const dia = +digitos.slice(0, 2), mes = +digitos.slice(2, 4), anio = +digitos.slice(4);
    const d = new Date(anio, mes - 1, dia);
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
      this.errorEscrito = 'Esa fecha no existe. Revisa el día y el mes.';
      return;
    }
    const iso = this.aIso(d);
    if (this.fueraDeRango(iso)) {
      this.errorEscrito = this.esNacimiento && this.maxEfectivo && iso > this.maxEfectivo
        ? 'La fecha de nacimiento no puede ser después de hoy.'
        : 'Esa fecha está fuera de lo permitido.';
      return;
    }
    this.mesVista = d.getMonth();
    this.anioVista = d.getFullYear();
    this.elegir({ ...this.celdaVacia, iso });
  }

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

    // Del más nuevo al más viejo: para una fecha de nacimiento se baja hacia atrás en el tiempo.
    const desde = this.anioMinimo, hasta = this.anioMaximo;
    if (this.anios.length !== hasta - desde + 1 || this.anios[0] !== hasta) {
      this.anios = Array.from({ length: Math.max(hasta - desde + 1, 0) }, (_, i) => hasta - i);
    }
  }

  /** Los 42 días de la rejilla son únicos, así que el iso sirve de identidad estable. */
  porIso(_: number, celda: ICelda): string { return celda.iso; }

  elegir(celda: ICelda): void {
    if (celda.deshabilitado) return;
    this.valor = celda.iso;
    this.textoEscrito = this.aTextoCorto(celda.iso);
    this.onChange(this.valor);
    this.onTouched();
    this.abierto = false;
    this.recalcular();
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesVista = hoy.getMonth();
    this.anioVista = hoy.getFullYear();
    this.vista = 'dias';
    this.recalcular();
    const iso = this.aIso(hoy);
    if (!this.fueraDeRango(iso)) this.elegir({ ...this.celdaVacia, iso });
  }

  limpiar(): void {
    this.valor = '';
    this.textoEscrito = '';
    this.onChange('');
    this.abierto = false;
    this.recalcular();
  }

  // ── Etiqueta visible ───────────────────────────────────────────────

  get etiqueta(): string {
    if (!this.valor) return '';
    const d = this.desdeIso(this.valor);
    if (!d) return this.valor;
    // En modo plano el campo vive dentro de un pill de filtro, que es compacto y va con
    // white-space:nowrap: "9 de septiembre de 2026" no cabe y se desbordaba encima del
    // pill de al lado (visto en produccion el 2026-09-10). Ahi se usa dd/mm/aaaa.
    if (this.plano) return this.aTextoCorto(this.valor);
    return `${d.getDate()} de ${this.nombresMes[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  }

  // ── Utilidades de fecha (siempre en local) ─────────────────────────

  private readonly celdaVacia: ICelda = {
    dia: 0, iso: '', otroMes: false, deshabilitado: false, hoy: false, seleccionado: false
  };

  private fueraDeRango(iso: string): boolean {
    if (this.minEfectivo && iso < this.minEfectivo) return true;
    if (this.maxEfectivo && iso > this.maxEfectivo) return true;
    return false;
  }

  private aIso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** yyyy-MM-dd → dd/mm/aaaa */
  private aTextoCorto(iso: string): string {
    const d = this.desdeIso(iso);
    if (!d) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private desdeIso(iso: string): Date | null {
    if (!iso) return null;
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
    if (this.minEfectivo && hoyIso < this.minEfectivo) return this.desdeIso(this.minEfectivo) ?? hoy;
    if (this.maxEfectivo && hoyIso > this.maxEfectivo) return this.desdeIso(this.maxEfectivo) ?? hoy;
    return hoy;
  }
}
