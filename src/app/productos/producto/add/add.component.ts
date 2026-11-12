import { FletesService, IViaje } from '../../../fletes/fletes.service';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IScannerControls } from '@zxing/browser';
import { iniciarEscanerConAutofoco } from '../../../shared/barcode-scanner.util';
import Swal from 'sweetalert2';
import { ModeloParaArticulos } from 'src/app/shared/alta-articulos/alta-articulos.component';
import { AuthService } from 'src/app/auth/auth.service';
import { IImagenDto } from '../models';
import { IProducto } from '../models/producto.model';
import { IProductoDTORec } from '../models/producto.dto.model';
import { ProductoService } from '../../service/producto.service';
import { VarianteService } from 'src/app/variante/service/variante.service';
import { AceptaMsiService } from 'src/app/shared/acepta-msi.service';
import { CalculoPrecioService, ICalculoGuardado, ICalculoParaGuardar } from 'src/app/shared/calculadora-precio/calculo-precio.service';
import { IResultadoCalculo } from 'src/app/shared/calculadora-precio/calculadora-precio.component';
// Nuevo — palabra clave para categorizar el producto en búsquedas
import { IPalabraClave } from 'src/app/palabras-clave/models/palabra-clave.model';
import { mensajeFotoIlegible, mensajeNoEsImagen, puedeSerImagen } from '../../../shared/imagen-comprimir.util';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('canvas',       { static: false }) canvasRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput',    { static: false }) fileInputRef!:   ElementRef<HTMLInputElement>;
  @ViewChild('videoCamara',  { static: false }) videoCamaraRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCamara', { static: false }) canvasCamaraRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('videoScanner', { static: false }) videoScannerRef!: ElementRef<HTMLVideoElement>;

  @Input() nombreCard    = 'Agregar Producto';
  @Input() productoUpdate: IProductoDTORec | null = null;

  /** Los viajes de compra en los que llegó este producto (solo al actualizar; solo lectura). */
  viajesProducto: IViaje[] = [];

  formProductos!: FormGroup;
  imagenesCargadas: IImagenDto[] = [];
  guardando = false;
  mostrandoCamara = false;
  private mediaStream: MediaStream | null = null;
  private formReady = false;

  // Escáner de código de barras (mismo patrón que variante/buscar/buscar.component.ts)
  escaneandoCodigo = false;
  private controlesEscanerCodigo: IScannerControls | null = null;
  // Nuevo — palabra clave seleccionada vía autocomplete
  palabraClaveSeleccionada: IPalabraClave | null = null;

  // Código de barras que tenía el producto AL ABRIR la pantalla de editar.
  // Desde el fix del back (2026-07-21), save/update matchean por `id` cuando
  // se manda (ver ejecutarGuardar) — cambiar el código ya no duplica un
  // producto normal. Sigue usándose para detectar borradores de carga
  // rápida (código autogenerado BRD-...), que NUNCA deben pasar por esta
  // pantalla — ver esBorradorCargaRapida().
  private codigoBarrasOriginal: string | null = null;
  // true mientras cargarProductoUpdate() está corriendo su patchValue —
  // evita que el listener de sinCodigoBarra regenere un código nuevo solo
  // porque el producto cargado no traía código (ver initCodigoBarra()).
  private cargandoDesdeUpdate = false;

  /**
   * Casilla "Acepta meses sin intereses" (solo admin). El producto no trae este dato: se lee y se guarda con
   * AceptaMsiService. Si el ambiente no la tiene (409/404), se oculta en vez de romper el formulario.
   */
  aceptaMsiDisponible = true;
  private aceptaMsiOriginal = false;

  get esActualizar(): boolean { return this.nombreCard.startsWith('Actualizar'); }

  // Etiquetas tal cual aparecen en pantalla, para nombrar el campo que falta.
  private static readonly ETIQUETAS: Record<string, string> = {
    nombre:       'Nombre',
    marca:        'Marca',
    precioCosto:  'Precio de compra',
    precioVenta:  'Precio de venta',
    precioRebaja: 'Precio con descuento',
    stock:        'Stock',
    descripcion:  'Descripción',
    codigoBarras: 'Código de barras',
  };

  // El botón de guardar se deshabilita con formProductos.invalid y antes no decía por qué:
  // se leía como si la imagen fuera obligatoria (no lo es, nunca entró al form).
  get camposFaltantes(): string[] {
    if (!this.formProductos) return [];
    return Object.keys(this.formProductos.controls)
      .filter(k => this.formProductos.get(k)!.invalid)
      .map(k => AddComponent.ETIQUETAS[k] ?? k);
  }

  constructor(
    private readonly fb:      FormBuilder,
    private readonly service: ProductoService,
    public  readonly authService: AuthService,
    private readonly router:  Router,
    private readonly varianteService: VarianteService,
    private readonly aceptaMsiService: AceptaMsiService,
    private readonly calculoPrecioService: CalculoPrecioService,
    private readonly fletesService: FletesService
  ) {}

  // ── Ciclo de vida ──────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildForm();
    this.initPrecioVenta();
    this.initCodigoBarra();
    this.initValidacionEliminarStock();
    this.formReady = true;
    if (this.esActualizar) {
      // El stock real en edición solo se mueve con "Actualizar stock" / "Eliminar stock" (que
      // suman/restan contra el stock real de la BD, con validación de no quedar negativo -- ver
      // guardarProducto() en el back). El campo "Stock" a secas queda bloqueado para que no se
      // pueda pisar el valor a mano por error (pedido 2026-08-28).
      this.formProductos.get('stock')?.disable();
    }
    if (this.esActualizar && this.productoUpdate) {
      this.cargarProductoUpdate();
    }
  }

  // "Eliminar stock" no puede superar el stock actual -- si el admin lo intenta, se marca
  // inválido en vivo (además de la validación del back, que es la que realmente protege el dato).
  private initValidacionEliminarStock(): void {
    this.formProductos.get('eliminarStock')!.valueChanges.subscribe((valor: number) => {
      const ctrl = this.formProductos.get('eliminarStock')!;
      const stockActual = +(this.formProductos.get('stock')?.value ?? 0);
      if (+valor > stockActual) {
        ctrl.setErrors({ excedeStock: true });
      } else if (ctrl.hasError('excedeStock')) {
        ctrl.setErrors(null);
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoUpdate'] && this.productoUpdate && this.esActualizar && this.formReady) {
      this.cargarProductoUpdate();
    }
  }

  // ── Construcción del form ──────────────────────────────────────────

  private buildForm(): void {
    this.formProductos = this.fb.group({
      nombre:         ['', [Validators.required, Validators.maxLength(100)]],
      precioCosto:    ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      precioVenta:    ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      precioRebaja:   ['',  Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      stock:          ['', [Validators.required, Validators.min(0)]],
      descripcion:    ['',  Validators.required],
      marca:          ['',  Validators.required],
      color:          [''],
      piezas:         [''],
      contenido:      [''],
      actualizarStock:['0'],
      eliminarStock:  ['0'],
      codigoBarras:   ['', [Validators.required, Validators.maxLength(100)]],
      sinCodigoBarra: [false],
      aceptaMsi:      [false],
    });
  }

  // ── Calcular precio (ayuda): abre el modal; solo «Usar este precio» escribe en «Precio de venta» ─────────
  calculadoraVisible = false;

  /** El número que hay ahora en un campo del formulario (null si está vacío o no es número). */
  valorNumero(campo: string): number | null {
    const v = parseFloat(String(this.formProductos?.get(campo)?.value ?? '').replace(',', '.'));
    return isFinite(v) && v > 0 ? v : null;
  }

  /** El cálculo que se hizo en la calculadora y todavía no se guarda: se manda al back cuando el producto se guarda (el producto nuevo aún no tiene id). */
  private calculoPendiente: ICalculoParaGuardar | null = null;
  /** Si el flete del cálculo difiere del viaje vigente: después de guardar se le pregunta al dueño si lo actualiza también en el viaje. */
  private viajePendiente: IResultadoCalculo['viaje'] | null = null;
  /** El último cálculo guardado del producto que se edita (null si nunca tuvo uno): se muestra en «Último cálculo de precio». */
  ultimoCalculo: ICalculoGuardado | null = null;
  /** Ya se preguntó si el producto tiene cálculo (para distinguir «cargando» de «nunca se calculó»). */
  ultimoCalculoCargado = false;
  /** Cálculos anteriores del producto (se leen solo si se pide verlos). */
  historialCalculos: ICalculoGuardado[] | null = null;
  historialAbierto = false;

  /** El producto que se edita (null en Nuevo producto). */
  get idProductoActual(): number | null { return this.esActualizar ? (this.productoUpdate?.idProducto ?? null) : null; }

  /**
   * El dueño eligió un precio en la calculadora: se pone en «Precio de venta» (igual que si lo escribiera; copia a «Precio con descuento» como siempre).
   * Si dejó marcada la casilla, «Precio de compra» pasa a ser el costo total real (compra + transporte + otros). El cálculo se guarda al guardar el producto.
   */
  usarPrecioCalculado(r: IResultadoCalculo): void {
    const ctrl = this.formProductos.get('precioVenta');
    if (!ctrl) return;
    ctrl.setValue(r.precio.toFixed(2));
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    if (r.actualizarCosto) {
      const costo = this.formProductos.get('precioCosto');
      costo?.setValue(r.costoTotal.toFixed(2));
      costo?.markAsDirty();
      costo?.markAsTouched();
    }
    this.calculoPendiente = r.calculo;
    this.viajePendiente = r.viaje ?? null;
  }

  /** Después de guardar el producto: guarda el cálculo de precio (con el precio de venta que de verdad quedó). Si falla, el producto ya está guardado y solo se avisa. */
  private guardarCalculoPrecio(productoId: number | undefined, precioVenta: number): Promise<void> {
    const calculo = this.calculoPendiente;
    const viaje = this.viajePendiente;
    this.calculoPendiente = null; this.viajePendiente = null;
    if (!productoId || !calculo || !this.authService.isAdminService) return Promise.resolve();
    // La promesa termina cuando ya se resolvió todo lo que pudo abrir un aviso (la pregunta del viaje incluida), para que el aviso de «guardado» no la tape.
    return new Promise<void>(resolve => {
      this.calculoPrecioService.guardar(productoId, { ...calculo, precioCobrado: precioVenta }).subscribe({
        next: guardado => {
          if (this.esActualizar) { this.ultimoCalculo = guardado; this.ultimoCalculoCargado = true; this.historialCalculos = null; }
          if (viaje) this.preguntarActualizarViaje(productoId, viaje).then(() => resolve(), () => resolve());
          else resolve();
        },
        error: () => {
          Swal.fire({
            icon: 'warning',
            title: 'El producto se guardó, pero…',
            text: 'No se pudo guardar el cálculo de precio (el historial). El precio del producto sí quedó.'
          }).then(() => resolve());
        }
      });
    });
  }

  /**
   * El flete que se usó en el cálculo es distinto al del viaje vigente del producto. Se le pregunta al dueño si lo actualiza también en el viaje; solo con su
   * «sí» se cambia (nunca en silencio). Las ventas ya ligadas al viaje no cambian: guardan su propia copia del flete.
   */
  private async preguntarActualizarViaje(productoId: number, v: NonNullable<IResultadoCalculo['viaje']>): Promise<void> {
    const fmt = (n: number) => '$' + (+n || 0).toFixed(2);
    const r = await Swal.fire({
      icon: 'question', title: '¿Actualizar también el viaje?',
      text: `En el cálculo pusiste ${fmt(v.fleteNuevo)} de flete por pieza y el viaje «${v.nombre}» tiene ${fmt(v.fleteActual)}. ¿Quieres cambiar el flete de este producto en ese viaje a ${fmt(v.fleteNuevo)}? Las ventas que ya se ligaron al viaje no cambian.`,
      showCancelButton: true, confirmButtonText: 'Sí, actualizar el viaje', cancelButtonText: 'No, dejar el viaje como está'
    });
    if (!r.isConfirmed) return;
    // Se vuelve a leer el viaje justo antes de guardar (por si alguien lo editó) y solo se cambia el flete de este producto.
    try {
      const viajes: any[] = await this.fletesService.deProducto(productoId).toPromise();
      const viaje = viajes.find((x: any) => x.id === v.viajeId);
      const renglon = viaje?.productos.find((p: any) => p.productoId === productoId);
      if (!viaje || !renglon) { await Swal.fire({ icon: 'warning', title: 'No se encontró el producto en el viaje', text: 'El viaje ya no lo tiene: no se cambió nada.' }); return; }
      renglon.fletePorPieza = v.fleteNuevo;
      try {
        await this.fletesService.actualizar(v.viajeId, viaje).toPromise();
        await Swal.fire({ icon: 'success', title: 'Viaje actualizado', text: `El flete de este producto en «${v.nombre}» ahora es ${fmt(v.fleteNuevo)} por pieza.`, timer: 2500, showConfirmButton: false });
      } catch (e: any) {
        await Swal.fire({ icon: 'error', title: 'No se pudo actualizar el viaje', text: e?.error?.mensaje || 'El producto y su cálculo sí se guardaron. Puedes cambiarlo en Catálogo → Fletes.' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'No se pudo leer el viaje', text: 'El producto y su cálculo sí se guardaron. Puedes cambiarlo en Catálogo → Fletes.' });
    }
  }

  /** Carga el último cálculo del producto que se edita para mostrarlo en el bloque «Último cálculo de precio». */
  private cargarUltimoCalculo(): void {
    const id = this.idProductoActual;
    this.ultimoCalculo = null;
    this.ultimoCalculoCargado = false;
    this.historialCalculos = null;
    this.historialAbierto = false;
    if (!id || !this.authService.isAdminService) return;
    this.calculoPrecioService.ultimo(id).subscribe(c => { this.ultimoCalculo = c; this.ultimoCalculoCargado = true; });
  }

  /** «Ver cálculos anteriores»: abre o cierra la lista y la lee la primera vez. */
  alternarHistorialCalculos(): void {
    this.historialAbierto = !this.historialAbierto;
    const id = this.idProductoActual;
    if (this.historialAbierto && this.historialCalculos === null && id) {
      this.calculoPrecioService.historial(id, 10).subscribe(h => this.historialCalculos = h);
    }
  }

  /** El «Precio de venta» que hay ahora en el formulario ya no es el que se cobró en el último cálculo. */
  get precioCambioDelCalculo(): boolean {
    const v = this.valorNumero('precioVenta');
    return !!this.ultimoCalculo && v !== null && Math.abs(v - this.ultimoCalculo.precioCobrado) > 0.005;
  }

  // Cuando cambia precioVenta, copiar a precioRebaja automáticamente
  private initPrecioVenta(): void {
    this.formProductos.get('precioVenta')!.valueChanges.subscribe(valor => {
      this.formProductos.get('precioRebaja')!.setValue(valor, { emitEvent: false });
    });
  }

  // Lógica limpia del checkbox de código de barras
  private initCodigoBarra(): void {
    this.formProductos.get('sinCodigoBarra')!.valueChanges.subscribe((sinCodigo: boolean) => {
      const ctrl = this.formProductos.get('codigoBarras')!;
      if (sinCodigo) {
        // patchValue() en cargarProductoUpdate() dispara este valueChanges
        // aunque el admin no haya tocado nada — si el producto que se está
        // editando llegó sin código, NO hay que inventarle uno nuevo aquí:
        // el backend matchea por código exacto, y un código recién generado
        // nunca existe en BD → crearía un producto duplicado al guardar.
        // Solo se genera cuando el admin activa el toggle a propósito.
        if (!this.cargandoDesdeUpdate) {
          ctrl.setValue(this.generarCodigoBarras());
        }
        ctrl.clearValidators();
      } else {
        // Limpiar para que el usuario ingrese el suyo
        //ctrl.setValue('');
        ctrl.setValidators([Validators.required, Validators.maxLength(100)]);
      }
      ctrl.updateValueAndValidity();
    });
  }

  // Formato: MMDDYYYY + 5 dígitos aleatorios = 13 chars  (ej: 0429202648731)
  private generarCodigoBarras(): string {
    const now  = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `${mm}${dd}${yyyy}${rand}`;
  }

  // ── Carga de datos en modo actualizar ──────────────────────────────

  // Nuevo — recibe la selección del autocomplete de palabra clave
  onPalabraClaveSeleccionada(p: IPalabraClave | null): void {
    this.palabraClaveSeleccionada = p;
  }

  // El tipo declara `codigoBarras: ICodigoBarra` (objeto { id, codigoBarras }),
  // pero el item que realmente llega desde la grilla (IProductoDTO) lo trae
  // como string plano — el cast `as IProductoDTORec` en UpdateComponent no
  // convierte el valor en tiempo de ejecución. Se soportan ambas formas para
  // no quedar con "[object Object]" si algún día el DTO cambia de forma.
  private extraerCodigo(cb: unknown): string {
    if (!cb) return '';
    if (typeof cb === 'string') return cb;
    if (typeof cb === 'object' && 'codigoBarras' in (cb as any)) {
      return (cb as any).codigoBarras ?? '';
    }
    return '';
  }

  private cargarProductoUpdate(): void {
    const p = this.productoUpdate!;
    this.viajesProducto = [];
    if (p.idProducto) this.fletesService.deProducto(p.idProducto).subscribe(v => this.viajesProducto = v);
    const codigo = this.extraerCodigo(p.codigoBarras);
    const tieneCodigo = !!codigo;
    this.codigoBarrasOriginal = codigo || null;
    // Precargar palabra clave si el producto ya tenía una asignada
    if (p.palabraClave) this.palabraClaveSeleccionada = p.palabraClave;

    this.cargandoDesdeUpdate = true;
    this.formProductos.patchValue({
      nombre:        p.nombre,
      precioCosto:   p.precioCosto ?? '',   // el costo real (antes se precargaba con el precio de venta y se sobreescribía al guardar)
      piezas:        p.piezas,
      color:         p.color,
      precioVenta:   p.precioVenta,
      precioRebaja:  p.precioRebaja,
      descripcion:   p.descripcion,
      stock:         p.stock,
      marca:         p.marca,
      contenido:     p.contenido,
      codigoBarras:  codigo,
      sinCodigoBarra:!tieneCodigo
    });
    this.cargandoDesdeUpdate = false;
    this.cargarAceptaMsi(p.idProducto);
    this.cargarUltimoCalculo();
  }

  /** Lee la casilla de meses del producto que se edita; si no está disponible, la oculta. */
  private cargarAceptaMsi(productoId: number | undefined): void {
    if (!productoId || !this.authService.isAdminService) return;
    this.aceptaMsiService.producto(productoId).subscribe(valor => {
      if (valor === null) {
        this.aceptaMsiDisponible = false;
        return;
      }
      this.aceptaMsiOriginal = valor;
      this.formProductos.patchValue({ aceptaMsi: valor });
    });
  }

  /**
   * Guarda la casilla de meses aparte del producto (el back no la lleva en /productos/save, a propósito:
   * así un ambiente sin la columna no se cae). En un producto nuevo solo se manda si se marcó.
   */
  private guardarAceptaMsi(productoId: number | undefined, acepta: boolean): void {
    if (!productoId || !this.authService.isAdminService || !this.aceptaMsiDisponible) return;
    const cambio = this.esActualizar ? acepta !== this.aceptaMsiOriginal : acepta;
    if (!cambio) return;
    this.aceptaMsiService.cambiarProducto(productoId, acepta).subscribe({
      next: valor => { this.aceptaMsiOriginal = valor; },
      error: err => Swal.fire({
        icon: 'warning',
        title: 'El producto se guardó, pero…',
        text: AceptaMsiService.mensajeDeError(err)
      })
    });
  }

  // ── Guardar ────────────────────────────────────────────────────────

  guardar(): void {
    if (this.formProductos.invalid) {
      this.formProductos.markAllAsTouched();
      return;
    }
    const raw = this.formProductos.getRawValue();

    // Borrador de carga rápida (código autogenerado BRD-...): aunque el back
    // ya matchea por id y no duplica, save/update NO resetean
    // `codigoBarrasGenerado` ni validan el estado de la imagen — queda en un
    // estado inconsistente (bloquea "habilitar", ensucia el filtro admin
    // codigoGenerado). Para estos SIEMPRE hay que usar Carga rápida de
    // imágenes → PUT /completar. Se bloquea por completo, no se ofrece
    // continuar (ver CAMBIOS_FRONT.md, sección "Aclaración importante...").
    if (this.esActualizar && this.esBorradorCargaRapida) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Este producto es un borrador de Carga rápida de imágenes',
        html: `Todavía tiene el código autogenerado <b>${this.codigoBarrasOriginal}</b>.
               Esta pantalla no es la indicada para completarlo — usa
               <b>📸 Carga rápida de imágenes</b> y el botón "✏️ Completar datos" de ese
               borrador, para que el código real quede asignado correctamente.`,
        confirmButtonText: 'Ir a Carga rápida de imágenes',
        showCancelButton: true,
        cancelButtonText: 'Quedarme aquí'
      }).then(res => {
        if (res.isConfirmed) this.router.navigate(['/carga-imagenes']);
      });
      return;
    }

    this.ejecutarGuardar(raw);
  }

  // true si el producto que se está editando nació de Carga rápida de
  // imágenes y todavía no tiene su código de barras real asignado.
  private get esBorradorCargaRapida(): boolean {
    return !!this.codigoBarrasOriginal?.toUpperCase().startsWith('BRD-');
  }

  private ejecutarGuardar(raw: any): void {
    const productoSave: IProducto = {
      nombre:         raw.nombre,
      precioCosto:    +raw.precioCosto,
      piezas:         +raw.piezas   || 0,
      color:           raw.color    || '',
      precioVenta:    +raw.precioVenta,
      precioRebaja:   +raw.precioRebaja || +raw.precioVenta,
      descripcion:     raw.descripcion  || '',
      stock:          +raw.stock,
      marca:           raw.marca,
      contenido:       raw.contenido   || '',
      actualizarStock:+raw.actualizarStock || 0,
      eliminarStock:  +raw.eliminarStock   || 0,
      codigoBarras:   { codigoBarras: raw.codigoBarras, id: 0 },
      listImagenes:      this.imagenesCargadas,
      palabraClaveId:    this.palabraClaveSeleccionada?.id ?? null,
      // Actualizar con la categoría quitada: el back ignora un id nulo (otras pantallas no mandan el campo), así que hay que decírselo.
      ...(this.esActualizar && !this.palabraClaveSeleccionada ? { quitarPalabraClave: true } : {}),
      imagenPrincipalId: this.productoUpdate?.imagenPrincipalId ?? null,
      // Requerido desde el fix del back (2026-07-21): sin id, save/update
      // vuelve a matchear por código de barras y puede duplicar el producto
      // si el código cambió. En modo "Agregar" no se manda (undefined) —
      // ahí sí se busca por código porque el producto todavía no tiene id.
      ...(this.esActualizar ? { id: this.productoUpdate?.idProducto } : {})
    };

    this.guardando = true;
    const aceptaMsi = !!raw.aceptaMsi;
    const categoria = this.palabraClaveSeleccionada;
    const tieneImagen = this.imagenesCargadas.length > 0;
    this.service.saveProducto(productoSave).subscribe({
      next: (guardado: { id?: number } | null) => {
        this.guardando = false;
        this.guardarAceptaMsi(guardado?.id ?? this.productoUpdate?.idProducto, aceptaMsi);
        const calculoListo = this.guardarCalculoPrecio(guardado?.id ?? this.productoUpdate?.idProducto, productoSave.precioVenta);
        this.resetForm();
        this.service.invalidarProdCache();
        // Modelo nuevo: en vez del aviso, la pregunta "¿Cuántos artículos quieres hacer?"
        // (PLAN_ALTA_MODELO_Y_ARTICULOS.md, flujo A).
        if (!this.esActualizar && guardado?.id) {
          this.accionArticulos = 'alta';
          this.modeloParaArticulos = {
            id: guardado.id,
            nombre: productoSave.nombre,
            stock: productoSave.stock,
            enArticulos: 0,
            color: productoSave.color,
            marca: productoSave.marca,
            descripcion: productoSave.descripcion,
            contenido: productoSave.contenido,
            categoria,
            tieneImagen
          };
          return;
        }
        // Actualizar modelo con stock libre: la misma pregunta (QA 2026-10-14, Prueba 20.3; antes
        // A1 la dejaba solo para el alta). El stock libre lo dice el back, ya con el ajuste guardado.
        const idActualizado = this.productoUpdate?.idProducto;
        if (this.esActualizar && idActualizado) {
          // Si hubo pregunta del viaje, se espera a que se conteste antes de abrir el siguiente aviso (si no, lo tapa y la pantalla se va).
          calculoListo.then(() => this.varianteService.stockDisponible(idActualizado).subscribe({
            next: sd => {
              const caben = sd.articulosQueAunCaben ?? Math.max(sd.disponible, 0);
              if (caben < 1) { this.avisoGuardado(); return; }
              this.accionArticulos = 'actualizar';
              this.modeloParaArticulos = {
                id: idActualizado,
                nombre: productoSave.nombre,
                stock: sd.stockTotal,
                enArticulos: sd.enVariantes,
                color: productoSave.color,
                marca: productoSave.marca,
                descripcion: productoSave.descripcion,
                contenido: productoSave.contenido,
                categoria,
                tieneImagen: sd.conFoto ?? tieneImagen
              };
            },
            error: () => this.avisoGuardado()
          }));
          return;
        }
        calculoListo.then(() => this.avisoGuardado());
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar el producto.', timer: 2000, showConfirmButton: false });
      }
    });
  }

  private avisoGuardado(): void {
    Swal.fire({
      title: this.esActualizar ? '¡Producto actualizado!' : '¡Producto guardado!',
      icon: 'success',
      timer: 1600,
      showConfirmButton: false
    }).then(() => {
      if (this.esActualizar) this.router.navigate(['/productos/buscar']);
    });
  }

  /** Modelo recién guardado al que se le ofrece agregar sus artículos (flujo A). */
  modeloParaArticulos: ModeloParaArticulos | null = null;
  accionArticulos: 'alta' | 'actualizar' = 'alta';

  alCerrarAltaArticulos(): void {
    this.modeloParaArticulos = null;
    // Al actualizar, se regresa a Modelos como antes (haya hecho artículos o no).
    if (this.esActualizar) this.router.navigate(['/productos/buscar']);
  }

  // alias usado en template del modo actualizar
  update(): void { this.guardar(); }

  private resetForm(): void {
    this.formProductos.reset({ sinCodigoBarra: false, actualizarStock: 0, eliminarStock: 0, aceptaMsi: false });
    this.imagenesCargadas = [];
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Helpers de validación para el template ─────────────────────────

  ctrl(name: string) { return this.formProductos.get(name); }
  isInvalid(name: string): boolean {
    const c = this.ctrl(name);
    return !!(c?.invalid && c?.touched);
  }

  get sinCodigoActivo(): boolean {
    return !!this.formProductos.get('sinCodigoBarra')?.value;
  }

  // ── Imágenes ──────────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('pf-drop--over');
  }

  onDragLeave(e: DragEvent): void {
    (e.currentTarget as HTMLElement).classList.remove('pf-drop--over');
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('pf-drop--over');
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    this.imagenesCargadas = [];
    Array.from(files).forEach(f => this.procesarImagen(f));
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.imagenesCargadas = [];
    Array.from(input.files).forEach(f => this.procesarImagen(f));
    input.value = '';
  }

  private readonly DIMENSION_MAX = 1280;
  private readonly CALIDAD_JPEG = 0.8;

  /** Una foto que el celular de la cuenta tomó (`<app-foto-celular>`): se agrega a las imágenes, igual que una elegida de la galería. */
  alRecibirFotoDelCelular(file: File): void {
    this.procesarImagen(file);
  }

  private procesarImagen(file: File): void {
    if (!puedeSerImagen(file)) {
      Swal.fire({ icon: 'warning', title: 'Formato no permitido', text: mensajeNoEsImagen(file.name) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const comprimido = this.comprimirImagen(img);
        this.imagenesCargadas.push({
          base64:       comprimido.split(',')[1],
          extension:    'image/jpeg',
          nombreImagen: file.name
        });
        if (this.imagenesCargadas.length === 1) this.mostrarEnCanvas(comprimido);
      };
      img.onerror = () => Swal.fire({ icon: 'warning', title: 'No se pudo abrir la foto', text: mensajeFotoIlegible(file.name) });
      img.src = original;
    };
    reader.readAsDataURL(file);
  }

  // Redimensiona al máximo de DIMENSION_MAX y reencoda como JPEG para evitar
  // 413 Request Entity Too Large al mandar varias fotos de cámara (3-8 MB c/u) en base64
  private comprimirImagen(img: HTMLImageElement): string {
    const escala = Math.min(1, this.DIMENSION_MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', this.CALIDAD_JPEG);
  }

  private mostrarEnCanvas(src: string): void {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
  }

  eliminarImagen(i: number): void {
    this.imagenesCargadas.splice(i, 1);
    if (this.imagenesCargadas.length === 0) {
      const canvas = this.canvasRef?.nativeElement;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── Cámara ────────────────────────────────────────────────────────

  async abrirCamara(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.mostrandoCamara = true;
      await new Promise(r => setTimeout(r, 100));
      this.videoCamaraRef.nativeElement.srcObject = this.mediaStream;
    } catch {
      Swal.fire({ icon: 'error', title: 'Sin acceso a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.', timer: 2500, showConfirmButton: false });
    }
  }

  capturarFoto(): void {
    const video  = this.videoCamaraRef?.nativeElement;
    const canvas = this.canvasCamaraRef?.nativeElement;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.cerrarCamara();
      this.procesarImagen(file);
    }, 'image/jpeg', 0.92);
  }

  cerrarCamara(): void {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.mediaStream = null;
    this.mostrandoCamara = false;
  }

  // ── Escáner de código de barras ──────────────────────────────────────
  // Reusa el mismo patrón que variante/buscar/buscar.component.ts →
  // iniciarEscaner() (BrowserMultiFormatReader de @zxing/browser).

  async iniciarEscanerCodigo(): Promise<void> {
    this.escaneandoCodigo = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      this.controlesEscanerCodigo = await iniciarEscanerConAutofoco(
        this.videoScannerRef.nativeElement,
        (result, _err, controls) => {
          if (result) {
            // El código escaneado siempre es el real: se apaga "generar
            // automático" (si estaba activo) para que el valor no se
            // sobrescriba y el input quede editable con lo escaneado.
            this.formProductos.patchValue({
              sinCodigoBarra: false,
              codigoBarras: result.getText()
            });
            controls.stop();
            this.escaneandoCodigo = false;
          }
        }
      );
    } catch {
      Swal.fire({ icon: 'error', title: 'No se pudo acceder a la cámara', text: 'Verifica que el navegador tiene permiso de cámara.', timer: 2500, showConfirmButton: false });
      this.escaneandoCodigo = false;
    }
  }

  /** El código llegó del celular (botón «📱»): igual que si se hubiera escaneado con la cámara de esta pantalla. */
  alRecibirCodigoDelCelular(codigo: string): void {
    this.formProductos.patchValue({ sinCodigoBarra: false, codigoBarras: codigo });
  }

  detenerEscanerCodigo(): void {
    this.controlesEscanerCodigo?.stop();
    this.controlesEscanerCodigo = null;
    this.escaneandoCodigo = false;
  }

  ngOnDestroy(): void {
    this.cerrarCamara();
    this.detenerEscanerCodigo();
  }
}
