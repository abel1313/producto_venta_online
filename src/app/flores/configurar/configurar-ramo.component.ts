import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  IAccesorioRamo, ICalcularPrecioResponse, IColorFlor, IFraseListon, IListonRequest,
  IRamoPedidoDetalleRequest, ITipoFlor, IValidarCantidadResponse, ICantidadFlor
} from '../models/flores.model';
import { FloresService } from '../service/flores.service';
import { AuthService } from '../../auth/auth.service';
import { UsuarioService } from '../../shared/usuario.service';
import { ClienteService } from '../../clietes/cliente.service';
import { LugarEntregaService } from '../../lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from '../../lugares-entrega/models/lugar-entrega.model';
import { VarianteService } from '../../variante/service/variante.service';
import { IPedidoVarianteDTO, IPedidoVarianteDetalleDTO } from '../../variante/models/pedido-variante.model';

interface IAccesorioSeleccion {
  accesorio: IAccesorioRamo;
  seleccionado: boolean;
  cantidad: number;
}

interface IRepartoColor {
  color: IColorFlor;
  cantidad: number;
}

type ListonModo = 'ninguno' | 'predefinida' | 'personalizada';

/**
 * Configurador del cliente — arma su propio ramo desde cero (Flujo A), a diferencia de
 * `VitrinaFloresComponent` que solo muestra combos ya armados por el admin (Flujo B).
 *
 * Flujo: especie → validar cantidad (con sugerencias si no "cierra el círculo") → repartir esa
 * cantidad entre colores con stock → accesorios opcionales (el papel se agrega solo si la
 * cantidad ya cruza el umbral que configuró el admin) → listón opcional → cálculo de precio en
 * vivo (`POST /v1/flores/calcular-precio`) → confirmar pedido con el mismo checkout ya probado
 * que usa `venta-variante` (mismo manejo de verificación de correo / registro incompleto /
 * precio desactualizado — no se reinventa, se reutiliza tal cual).
 */
@Component({
  selector: 'app-configurar-ramo',
  templateUrl: './configurar-ramo.component.html',
  styleUrls: ['./configurar-ramo.component.scss']
})
export class ConfigurarRamoComponent implements OnInit, OnDestroy {

  // ── Catálogo base ────────────────────────────────────────────────────────
  tipos: ITipoFlor[] = [];
  accesorios: IAccesorioRamo[] = [];
  frases: IFraseListon[] = [];
  cantidades: ICantidadFlor[] = [];
  lugares: ILugarEntrega[] = [];
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;

  // ── Paso 1 — especie ─────────────────────────────────────────────────────
  tipoSeleccionadoId = 0;

  // ── Paso 2 — cantidad ────────────────────────────────────────────────────
  cantidadDeseada: number | null = null;
  validandoCantidad = false;
  resultadoValidacion: IValidarCantidadResponse | null = null;
  cantidadConfirmada: number | null = null;

  // ── Paso 3 — repartir entre colores ──────────────────────────────────────
  coloresDisponibles: IColorFlor[] = [];
  cargandoColores = false;
  reparto: IRepartoColor[] = [];

  // ── Paso 4 — accesorios ──────────────────────────────────────────────────
  seleccionAccesorios: IAccesorioSeleccion[] = [];

  // ── Paso 5 — listón ──────────────────────────────────────────────────────
  listonModo: ListonModo = 'ninguno';
  fraseSeleccionadaId = 0;
  fraseTexto = '';

  // ── Paso 6 — entrega ─────────────────────────────────────────────────────
  lugarEntregaId: number | null = null;
  recogerEnLocal = false;

  // ── Cálculo en vivo ──────────────────────────────────────────────────────
  calculo: ICalcularPrecioResponse | null = null;
  calculando = false;
  errorCalculo: string | null = null;
  private recalcular$ = new Subject<void>();

  // ── Checkout ─────────────────────────────────────────────────────────────
  guardando = false;
  private idUsuario = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly flores: FloresService,
    private readonly authService: AuthService,
    private readonly usuarioService: UsuarioService,
    private readonly clienteService: ClienteService,
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly varianteService: VarianteService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();

    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });

    this.lugarEntregaService.getAll().subscribe({
      next: d => { this.lugares = d; },
      error: () => { /* opcional — sin lugares no bloquea el resto del formulario */ }
    });

    this.recalcular$.pipe(debounceTime(450), takeUntil(this.destroy$)).subscribe(() => this.ejecutarCalculo());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    forkJoin({
      tipos:      this.flores.tiposGetAll(),
      accesorios: this.flores.accesoriosGetAll(),
      frases:     this.flores.frasesGetAll(),
      // Se traen las cantidades para poder decirle al cliente cuánto le va a costar el papel
      // ANTES de que lo marque: el precio del accesorio es por pliego, y cuántos pliegos lleva
      // depende del tamaño del ramo (`CantidadFlorValida.pliegos`). Sin esto, la casilla decía
      // "$5.00" cuando el cobro real de un ramo de 20 son $15 (3 pliegos).
      cantidades: this.flores.cantidadesGetAll()
    }).subscribe({
      next: r => {
        this.tipos      = r.tipos.filter(t => t.activo);
        this.accesorios = r.accesorios.filter(a => a.activo);
        this.frases     = r.frases.filter(f => f.activo);
        this.cantidades = r.cantidades.filter(c => c.activo);
        this.seleccionAccesorios = this.accesorios.map(a => ({ accesorio: a, seleccionado: false, cantidad: 1 }));
        this.cargandoCatalogo = false;
      },
      error: err => {
        this.cargandoCatalogo = false;
        this.errorCatalogo = this.msg(err, 'No se pudo cargar el catálogo de flores.');
      }
    });
  }

  // ── Paso 1 — especie ─────────────────────────────────────────────────────

  onCambiarEspecie(): void {
    this.cantidadDeseada = null;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.coloresDisponibles = [];
    this.reparto = [];
    this.calculo = null;
    if (!this.tipoSeleccionadoId) return;

    this.cargandoColores = true;
    this.flores.coloresPorTipoFlor(this.tipoSeleccionadoId).subscribe({
      next: cs => { this.coloresDisponibles = cs; this.cargandoColores = false; },
      error: err => {
        this.cargandoColores = false;
        this.errorCatalogo = this.msg(err, 'No se pudieron cargar los colores de esta especie.');
      }
    });
  }

  // ── Paso 2 — cantidad ────────────────────────────────────────────────────

  /** Si el cliente cambia el número después de ya haber validado, esa validación queda obsoleta
   * — se limpia todo lo que dependía de ella para forzar un "Validar" nuevo, y que el aviso
   * verde de "cantidad válida" no se quede pegado mostrando un número que ya no es el escrito. */
  onCambiarCantidadDeseada(): void {
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.reparto = [];
    this.calculo = null;
  }

  validarCantidad(): void {
    if (!this.tipoSeleccionadoId || !this.cantidadDeseada || this.cantidadDeseada <= 0) return;
    this.validandoCantidad = true;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.reparto = [];
    this.calculo = null;

    this.flores.validarCantidad({ tipoFlorId: this.tipoSeleccionadoId, cantidadSolicitada: this.cantidadDeseada }).subscribe({
      next: r => {
        this.validandoCantidad = false;
        this.resultadoValidacion = r;
        if (r.valida) this.confirmarCantidad(r.cantidadSolicitada);
      },
      error: err => {
        this.validandoCantidad = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo validar la cantidad.') });
      }
    });
  }

  /**
   * El texto que acompaña a la cantidad confirmada. Sale del `mensaje` del back, que distingue
   * "se cobra por unidad" (cantidad menor a la más chica registrada) de "forma bien el círculo"
   * (cantidad sí registrada) — una diferencia que le importa al cliente y al dueño.
   *
   * Solo se usa cuando la cantidad confirmada es la que se validó: si el cliente eligió una de
   * las alternativas sugeridas, ese mensaje ya no aplica (hablaba de la cantidad rechazada).
   */
  get mensajeCantidad(): string {
    const r = this.resultadoValidacion;
    const aplica = r && r.valida && r.cantidadSolicitada === this.cantidadConfirmada;
    return (aplica && r!.mensaje) ? r!.mensaje! : 'cantidad válida';
  }

  usarAlternativa(cantidad: number | null): void {
    if (!cantidad) return;
    this.confirmarCantidad(cantidad);
  }

  private confirmarCantidad(cantidad: number): void {
    this.cantidadConfirmada = cantidad;
    this.reparto = this.coloresDisponibles.map(c => ({ color: c, cantidad: 0 }));
    // Un solo color disponible: se reparte todo ahí de entrada, no tiene caso obligar a
    // escribirlo a mano si no hay entre qué elegir.
    if (this.reparto.length === 1) this.reparto[0].cantidad = cantidad;
    this.actualizarPapelObligatorio();
    this.pedirRecalculo();
  }

  // ── Paso 3 — repartir entre colores ──────────────────────────────────────

  get totalRepartido(): number {
    return this.reparto.reduce((s, r) => s + (r.cantidad || 0), 0);
  }

  get restante(): number {
    return (this.cantidadConfirmada ?? 0) - this.totalRepartido;
  }

  get repartoCompleto(): boolean {
    return this.cantidadConfirmada != null && this.restante === 0 && this.totalRepartido > 0;
  }

  onCambiarReparto(r: IRepartoColor): void {
    if (r.cantidad < 0) r.cantidad = 0;
    if (r.cantidad > r.color.stock) r.cantidad = r.color.stock;
    this.pedirRecalculo();
  }

  // ── Paso 4 — accesorios ──────────────────────────────────────────────────

  get accesorioPapel(): IAccesorioRamo | undefined {
    return this.accesorios.find(a => a.esPapel);
  }

  /**
   * Cuántos pliegos lleva el ramo de la cantidad ya confirmada, según lo que el dueño configuró
   * en el catálogo. `null` si esa cantidad no está registrada (venta por unidad) o si todavía no
   * le puso el número — ahí el back cae a su respaldo y no podemos anticipar el total.
   */
  get pliegosDelRamo(): number | null {
    if (this.cantidadConfirmada == null) return null;
    return this.cantidades.find(c => c.cantidad === this.cantidadConfirmada)?.pliegos ?? null;
  }

  /** Lo que de verdad se va a cobrar por el papel: pliegos × precio unitario. */
  get precioPapelEstimado(): number | null {
    const papel = this.accesorioPapel;
    if (!papel) return null;
    const pliegos = this.pliegosDelRamo;
    return pliegos ? pliegos * papel.precio : papel.precio;
  }

  /**
   * Los accesorios que el cliente puede elegir de verdad. Cuando el papel ya es obligatorio por
   * la cantidad, se saca de la lista: no es una decisión suya y verlo como casilla bloqueada
   * solo generaba la duda de "¿por qué no la puedo quitar?". El cobro sigue visible en el
   * resumen, con el desglose de pliegos.
   */
  get accesoriosSeleccionables(): { accesorio: IAccesorioRamo; seleccionado: boolean; cantidad: number }[] {
    return this.seleccionAccesorios.filter(s => !(s.accesorio.esPapel && this.papelForzado));
  }

  /** `true` cuando la cantidad ya cruzó el umbral del admin — el papel deja de ser opcional. */
  get papelForzado(): boolean {
    const papel = this.accesorioPapel;
    if (!papel || papel.umbralActivacion == null || this.cantidadConfirmada == null) return false;
    return this.cantidadConfirmada > papel.umbralActivacion;
  }

  private actualizarPapelObligatorio(): void {
    if (!this.papelForzado) return;
    const papel = this.accesorioPapel;
    const entry = this.seleccionAccesorios.find(s => s.accesorio.id === papel?.id);
    if (entry) entry.seleccionado = true;
  }

  toggleAccesorio(entry: IAccesorioSeleccion): void {
    // Si el papel ya es obligatorio por la cantidad, no se puede desmarcar desde aquí.
    if (entry.accesorio.esPapel && this.papelForzado) { entry.seleccionado = true; return; }
    this.pedirRecalculo();
  }

  onCambiarCantidadAccesorio(): void {
    this.pedirRecalculo();
  }

  // ── Paso 5 — listón ──────────────────────────────────────────────────────

  onCambiarListon(): void {
    this.pedirRecalculo();
  }

  // ── Paso 6 — entrega ─────────────────────────────────────────────────────

  onRecogerEnLocalChange(): void {
    if (this.recogerEnLocal) this.lugarEntregaId = null;
    this.pedirRecalculo();
  }

  onLugarChange(): void {
    if (this.lugarEntregaId) this.recogerEnLocal = false;
    this.pedirRecalculo();
  }

  // ── Cálculo en vivo ──────────────────────────────────────────────────────

  pedirRecalculo(): void {
    this.recalcular$.next();
  }

  private ejecutarCalculo(): void {
    if (!this.repartoCompleto) { this.calculo = null; return; }
    const colores = this.reparto.filter(r => r.cantidad > 0).map(r => ({ colorFlorId: r.color.id, cantidad: r.cantidad }));
    if (!colores.length) { this.calculo = null; return; }

    const accesoriosReq: { accesorioId: number }[] = [];
    this.seleccionAccesorios.filter(s => s.seleccionado).forEach(s => {
      // El papel no se pregunta "cuántos" — una sola entrada basta, el back calcula los pliegos.
      const veces = s.accesorio.esPapel ? 1 : Math.max(1, s.cantidad || 1);
      for (let i = 0; i < veces; i++) accesoriosReq.push({ accesorioId: s.accesorio.id });
    });

    const listones: IListonRequest[] = [];
    if (this.listonModo === 'predefinida' && this.fraseSeleccionadaId) {
      listones.push({ fraseListonPredefinidaId: this.fraseSeleccionadaId });
    } else if (this.listonModo === 'personalizada' && this.fraseTexto.trim()) {
      listones.push({ fraseListonPersonalizada: this.fraseTexto.trim() });
    }

    this.calculando = true;
    this.errorCalculo = null;
    this.flores.calcularPrecio({
      colores,
      accesorios: accesoriosReq,
      listones,
      lugarEntregaId: this.lugarEntregaId ?? undefined,
      recogerEnLocal: this.recogerEnLocal || undefined
    }).subscribe({
      next: r => { this.calculo = r; this.calculando = false; },
      error: err => {
        this.calculando = false;
        this.calculo = null;
        this.errorCalculo = this.msg(err, 'No se pudo calcular el precio con esta combinación.');
      }
    });
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  confirmarPedido(): void {
    if (!this.calculo || this.guardando) return;

    const avisoFrase = this.calculo.tieneListonPendienteValidacion
      ? `<p style="color:#b45309;margin-top:10px">${this.calculo.avisoFrasePendiente ?? 'El precio de tu frase queda pendiente de aprobación.'}</p>`
      : '';

    Swal.fire({
      title: 'Confirmar tu ramo',
      icon: 'question',
      html: `<p class="fw-bold fs-5">Total: $${this.calculo.total.toFixed(2)}</p>${avisoFrase}`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.resolverClienteYGuardar();
    });
  }

  private resolverClienteYGuardar(): void {
    if (this.idUsuario === 0) {
      Swal.fire({
        title: 'Necesitas una cuenta',
        icon: 'info',
        html: '<p>Para pedir tu ramo primero regístrate.</p>',
        showCancelButton: true,
        confirmButtonText: 'Ir a registro',
        cancelButtonText: 'Cancelar'
      }).then(result => { if (result.isConfirmed) this.router.navigate(['/usuarios/registrar']); });
      return;
    }
    this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
      next: (res: any) => {
        if (res) {
          this.guardarPedido(res);
        } else {
          Swal.fire({
            title: 'Completa tu registro',
            icon: 'info',
            html: '<p>Para pedir tu ramo necesitas registrarte como cliente.</p>',
            showCancelButton: true,
            confirmButtonText: 'Registrarme',
            cancelButtonText: 'Cancelar'
          }).then(result => { if (result.isConfirmed) this.router.navigate(['/clientes/agregar']); });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener tu perfil de cliente.' })
    });
  }

  private guardarPedido(clienteId: number): void {
    if (!this.calculo) return;
    this.guardando = true;

    const detalles: IPedidoVarianteDetalleDTO[] = [];

    this.calculo.coloresCalculados.forEach(c => {
      detalles.push({ producto: { id: 0 }, cantidad: c.cantidad, precioUnitario: c.precioUnitario, subTotal: c.subtotal, varianteId: c.varianteId });
    });

    if (this.calculo.papelObligatorioAplicado && this.calculo.papelVarianteId) {
      // ⚠️ Con floresPorPliego configurado, precioPapel es el TOTAL ya multiplicado — el back
      // valida precioUnitario contra el precio de catálogo (que es por pliego), así que aquí
      // SIEMPRE se manda precioUnitarioPapel (o el precio fijo de siempre si no aplica pliegos).
      const cantidad = this.calculo.pliegosPapel ?? 1;
      const precioUnitario = this.calculo.precioUnitarioPapel ?? this.calculo.precioPapel;
      detalles.push({ producto: { id: 0 }, cantidad, precioUnitario, subTotal: precioUnitario * cantidad, varianteId: this.calculo.papelVarianteId });
    }

    this.calculo.accesoriosCalculados.forEach(a => {
      detalles.push({ producto: { id: 0 }, cantidad: a.cantidad, precioUnitario: a.precioUnitario, subTotal: a.subtotal, varianteId: a.varianteId });
    });

    // Solo la frase PREDEFINIDA ya tiene precio/varianteId resuelto — la personalizada queda
    // pendiente de aprobación (sin línea aquí) y se registra aparte con guardarDetalleRamo().
    this.calculo.listonesCalculados.forEach(l => {
      if (l.varianteId && l.precio != null) {
        detalles.push({ producto: { id: 0 }, cantidad: 1, precioUnitario: l.precio, subTotal: l.precio, varianteId: l.varianteId });
      }
    });

    if (this.calculo.costoEnvio != null && this.calculo.envioVarianteId) {
      detalles.push({ producto: { id: 0 }, cantidad: 1, precioUnitario: this.calculo.costoEnvio, subTotal: this.calculo.costoEnvio, varianteId: this.calculo.envioVarianteId });
    }

    const pedido: IPedidoVarianteDTO = {
      cliente: { id: clienteId },
      tipoPedido: 'NORMAL',
      estadoPedido: 'Pendiente',
      fechaPedido: new Date().toISOString().split('T')[0],
      observaciones: '',
      lugarEntregaId: this.lugarEntregaId ?? undefined,
      detalles
    };

    this.varianteService.guardarPedidoVariante(pedido).subscribe({
      next: (res: any) => {
        if (res?.data != null) {
          this.varianteService.invalidarCache();
          this.finalizarConDetalleRamo(res.data.id);
        } else {
          this.guardando = false;
          Swal.fire({ icon: 'error', title: 'Error', text: res?.mensaje ?? 'No se pudo guardar el pedido.' });
        }
      },
      error: (err) => {
        this.guardando = false;
        const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
        if (msg.toLowerCase().includes('verificar')) {
          this.flujoVerificacion(clienteId);
        } else if (msg.toLowerCase().includes('completar tus datos')) {
          Swal.fire({
            icon: 'info', title: 'Completa tu perfil',
            text: 'Necesitamos tu nombre, apellido paterno y teléfono antes de generar un pedido.',
            confirmButtonText: 'Completar datos', showCancelButton: true, cancelButtonText: 'Cancelar'
          }).then(r => { if (r.isConfirmed) this.router.navigate(['/mis-datos']); });
        } else if (msg.toLowerCase().includes('no es valido') || msg.toLowerCase().includes('no es válido')) {
          Swal.fire({
            icon: 'warning', title: 'Precio desactualizado',
            html: `<p>${msg}</p><p>Algo cambió mientras armabas tu ramo — vuelve a intentarlo.</p>`,
            confirmButtonText: 'Reintentar'
          }).then(() => this.pedirRecalculo());
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: msg || 'No se pudo guardar el pedido.' });
        }
      }
    });
  }

  /**
   * Solo hace falta cuando hay algo que guardar que no está ya en las líneas del pedido: frase
   * (predefinida o personalizada), zona de entrega o recoger en local. Si falla, el pedido YA
   * quedó guardado y cobrado bien — no se bloquea ni se asusta al cliente por un detalle de
   * producción que el admin puede completar manualmente después.
   */
  private finalizarConDetalleRamo(pedidoId: number): void {
    const hayFrase = this.listonModo !== 'ninguno';
    const hayEntrega = !!this.lugarEntregaId || this.recogerEnLocal;
    if (!hayFrase && !hayEntrega) { this.completarExito(pedidoId); return; }

    const body: IRamoPedidoDetalleRequest = {
      ramoArmadoId: null,
      colores: this.reparto.filter(r => r.cantidad > 0).map(r => ({ colorFlorId: r.color.id, cantidad: r.cantidad })),
      fraseListonPredefinidaId: this.listonModo === 'predefinida' ? this.fraseSeleccionadaId : null,
      fraseListonPersonalizada: this.listonModo === 'personalizada' ? this.fraseTexto.trim() : null,
      lugarEntregaId: this.lugarEntregaId ?? null,
      recogerEnLocal: this.recogerEnLocal
    };
    this.flores.guardarDetalleRamo(pedidoId, body).subscribe({
      next: () => this.completarExito(pedidoId),
      error: () => this.completarExito(pedidoId)
    });
  }

  private completarExito(pedidoId: number): void {
    this.guardando = false;
    const provisional = this.calculo?.tieneListonPendienteValidacion;
    Swal.fire({
      icon: 'success',
      title: '¡Tu ramo quedó registrado!',
      html: `<p>Pedido #${pedidoId}</p>` +
            (provisional ? `<p style="color:#b45309">${this.calculo?.avisoFrasePendiente ?? 'El precio final de tu frase se confirma pronto.'}</p>` : ''),
      confirmButtonText: 'Ver mis pedidos'
    }).then(() => {
      this.resetTodo();
      this.router.navigate(['/pedidos/mis-pedidos']);
    });
  }

  private resetTodo(): void {
    this.tipoSeleccionadoId = 0;
    this.cantidadDeseada = null;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.coloresDisponibles = [];
    this.reparto = [];
    this.seleccionAccesorios = this.accesorios.map(a => ({ accesorio: a, seleccionado: false, cantidad: 1 }));
    this.listonModo = 'ninguno';
    this.fraseSeleccionadaId = 0;
    this.fraseTexto = '';
    this.lugarEntregaId = null;
    this.recogerEnLocal = false;
    this.calculo = null;
  }

  // ── Verificación de correo — copia exacta del flujo ya probado en
  // venta-variante.component.ts (enviar código → capturarlo → reintentar el pedido) ──────────

  private flujoVerificacion(clienteId: number): void {
    this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
      next: () => this.mostrarSwalCodigo(clienteId),
      error: () => this.mostrarSwalCodigo(clienteId) // mostrar igual aunque falle el envío
    });
  }

  private mostrarSwalCodigo(clienteId: number): void {
    Swal.fire({
      icon: 'info',
      title: 'Verifica tu correo',
      html: `
        <p style="margin-bottom:12px">Tu correo no está verificado.<br>
        Ingresa el código de <strong>6 dígitos</strong> que enviamos a tu correo electrónico.</p>
        <input id="swal-codigo-ramo" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:160px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #00875A;border-radius:8px;outline:none">
        <div id="swal-resend-ramo" style="margin-top:12px;font-size:0.85rem;color:#64748b">
          ¿No llegó?
          <span id="swal-resend-btn-ramo" style="color:#00875A;cursor:pointer;text-decoration:underline">
            Reenviar código
          </span>
        </div>
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#00875A',
      didOpen: () => {
        const btn = document.getElementById('swal-resend-btn-ramo');
        if (btn) {
          btn.addEventListener('click', () => {
            btn.textContent = 'Enviando…';
            (btn as HTMLElement).style.pointerEvents = 'none';
            this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
              next: () => { btn.textContent = '¡Enviado!'; },
              error: () => { btn.textContent = 'Reintentar'; (btn as HTMLElement).style.pointerEvents = 'auto'; }
            });
          });
        }
      },
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-ramo') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(clienteId, codigo).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) return;
      Swal.fire({
        icon: 'success',
        title: '¡Correo verificado!',
        text: 'Ahora registraremos tu ramo.',
        timer: 1800,
        showConfirmButton: false
      }).then(() => this.guardarPedido(clienteId));
    });
  }

  // ── Helpers de template ──────────────────────────────────────────────────

  nombreTipo(id: number): string {
    return this.tipos.find(t => t.id === id)?.nombre ?? '—';
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
