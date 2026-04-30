import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { IClienteBusquedaDto } from 'src/app/productos/producto/detalle-productos/models/pedidos.model';
import { PagoService } from 'src/app/pedidos/pago.service';
import { IOpcionMesesDto, IOpcionPagoDto, ITerminalIniciarRequest } from 'src/app/pedidos/mis-pedidos/models/IPago.model';
import Swal from 'sweetalert2';
import { IVarianteResumen } from '../models/variante.model';
import { VarianteService, IVentaDirectaRequest, IVentaDirectaResponse } from '../service/variante.service';
import { UsuarioService } from 'src/app/shared/usuario.service';

interface ILineaVenta {
  variante: IVarianteResumen;
  cantidad:  number;
  subTotal:  number;
}

@Component({
  selector: 'app-venta-directa',
  templateUrl: './venta-directa.component.html',
  styleUrls: ['./venta-directa.component.scss']
})
export class VentaDirectaComponent implements OnInit, OnDestroy {

  // ── Búsqueda de variantes (panel izquierdo) ────────────────────────
  terminoVariante  = '';
  resultados:      IVarianteResumen[] = [];
  buscandoVariante = false;
  private varSub$  = new Subject<string>();

  // ── Líneas de venta ────────────────────────────────────────────────
  lineas: ILineaVenta[] = [];

  // ── Cliente ────────────────────────────────────────────────────────
  terminoCliente       = '';
  clientes:            IClienteBusquedaDto[] = [];
  buscandoCliente      = false;
  clienteSeleccionado: IClienteBusquedaDto | null = null;
  private cliSub$      = new Subject<string>();
  private clienteResolvedId = 0;

  // ── Forma de pago (cargada al inicio) ─────────────────────────────
  opcionesEstructuradas: IOpcionPagoDto[] = [];
  tipoPagoActivo:        IOpcionPagoDto | null = null;
  mesesSeleccionado:     IOpcionMesesDto | null = null;
  pagosYMesesId:         number | null = null;
  cargandoPagos          = false;

  // ── Procesamiento / terminal ───────────────────────────────────────
  procesando       = false;
  mostrarTerminal  = false;
  ventaCreada:     IVentaDirectaResponse | null = null;
  estadoTerminal: 'idle'|'procesando'|'aprobado'|'rechazado'|'cancelado'|'bloqueado' = 'idle';
  errorTerminal:   string | null = null;
  intentId:        string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // ── Visor de imagen ────────────────────────────────────────────────
  mostrarVisor = false;
  imagenVisor  = '';
  nombreVisor  = '';

  // ── Auth ───────────────────────────────────────────────────────────
  idUsuario   = 0;
  isAdminUser = false;

  private destroy$    = new Subject<void>();
  private varianteSub!: Subscription;
  private clienteSub!:  Subscription;

  constructor(
    private readonly varianteService: VarianteService,
    private readonly clienteService:  ClienteService,
    private readonly pagoService:     PagoService,
    private readonly authService:     AuthService,
    private readonly usuarioService:  UsuarioService
  ) {}

  ngOnInit(): void {
    this.authService.userRoles$.pipe(takeUntil(this.destroy$)).subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      this.idUsuario = id;
    });

    // Cargar formas de pago al iniciar
    this.cargarPagos();

    // Búsqueda de variantes con debounce
    this.varianteSub = this.varSub$.pipe(
      filter(t => t.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(t => this.buscarVariantes(t));

    // Búsqueda de clientes con debounce
    this.clienteSub = this.cliSub$.pipe(
      filter(t => t.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.buscarClientes());
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    this.varianteSub?.unsubscribe();
    this.clienteSub?.unsubscribe();
    this.stopPolling();
  }

  // ── Pagos ──────────────────────────────────────────────────────────

  private cargarPagos(): void {
    this.cargandoPagos = true;
    this.pagoService.getOpcionesEstructuradas().subscribe({
      next: res => { this.opcionesEstructuradas = res.data ?? []; this.cargandoPagos = false; },
      error: ()  => { this.cargandoPagos = false; }
    });
  }

  seleccionarTipoPago(opcion: IOpcionPagoDto): void {
    this.tipoPagoActivo   = opcion;
    this.mesesSeleccionado = null;
    this.pagosYMesesId    = opcion.mostrarMeses ? null : opcion.pagosYMesesId;
  }

  seleccionarMeses(opcion: IOpcionMesesDto): void {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId     = opcion.pagosYMesesId;
  }

  // ── Búsqueda de variantes ──────────────────────────────────────────

  onInputVariante(): void {
    if (!this.terminoVariante.trim()) { this.resultados = []; return; }
    this.varSub$.next(this.terminoVariante);
  }

  private buscarVariantes(termino: string): void {
    this.buscandoVariante = true;
    const esCodigoBarras = /^\d+$/.test(termino);
    const params = esCodigoBarras
      ? { codigoBarras: termino, pagina: 1, size: 20 }
      : { nombre: termino,      pagina: 1, size: 20 };

    this.varianteService.buscar(params).subscribe({
      next: res => { this.resultados = res.t ?? []; this.buscandoVariante = false; },
      error: ()  => { this.buscandoVariante = false; }
    });
  }

  // ── Líneas de venta ────────────────────────────────────────────────

  agregarAVenta(v: IVarianteResumen): void {
    const idx = this.lineas.findIndex(l => l.variante.id === v.id);
    if (idx !== -1) {
      if (this.lineas[idx].cantidad >= (v.stock ?? 0)) {
        Swal.fire({ icon: 'warning', title: 'Sin stock suficiente', timer: 1400, showConfirmButton: false });
        return;
      }
      this.lineas[idx].cantidad++;
      this.lineas[idx].subTotal = this.lineas[idx].cantidad * (this.lineas[idx].variante.precio ?? 0);
    } else {
      if ((v.stock ?? 0) <= 0) {
        Swal.fire({ icon: 'warning', title: 'Producto sin stock', timer: 1400, showConfirmButton: false });
        return;
      }
      this.lineas.push({ variante: v, cantidad: 1, subTotal: v.precio ?? 0 });
    }
  }

  incrementar(linea: ILineaVenta): void {
    if (linea.cantidad >= (linea.variante.stock ?? 0)) return;
    linea.cantidad++;
    linea.subTotal = linea.cantidad * (linea.variante.precio ?? 0);
  }

  decrementar(linea: ILineaVenta): void {
    if (linea.cantidad <= 1) { this.quitarLinea(this.lineas.indexOf(linea)); return; }
    linea.cantidad--;
    linea.subTotal = linea.cantidad * (linea.variante.precio ?? 0);
  }

  quitarLinea(i: number): void { this.lineas.splice(i, 1); }

  limpiarVenta(): void {
    Swal.fire({
      title: '¿Limpiar la venta?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar', confirmButtonColor: '#d33'
    }).then(r => { if (r.isConfirmed) this.limpiarTodo(); });
  }

  private limpiarTodo(): void {
    this.lineas = [];
    this.clienteSeleccionado = null;
    this.terminoCliente = '';
    this.clienteResolvedId = 0;
    this.ventaCreada = null;
    this.mostrarTerminal = false;
    this.estadoTerminal = 'idle';
  }

  get totalVenta(): number { return this.lineas.reduce((s, l) => s + l.subTotal, 0); }
  get totalUnidades(): number { return this.lineas.reduce((s, l) => s + l.cantidad, 0); }

  get puedeCobrar(): boolean {
    return this.lineas.length > 0 && this.pagosYMesesId !== null && !this.procesando;
  }

  // ── Visor de imagen ────────────────────────────────────────────────

  verImagen(base64: string | null | undefined, nombre: string): void {
    if (!base64) return;
    this.imagenVisor = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    this.nombreVisor  = nombre;
    this.mostrarVisor = true;
  }
  cerrarVisor(): void { this.mostrarVisor = false; }

  labelVariante(v: IVarianteResumen): string {
    return [v.talla, v.color, v.marca].filter(Boolean).join(' · ') || `Variante #${v.id}`;
  }

  // ── Cliente ────────────────────────────────────────────────────────

  onInputCliente(): void { this.cliSub$.next(this.terminoCliente); }

  buscarClientes(): void {
    this.buscandoCliente = true;
    this.clienteService.buscarClientes(this.terminoCliente, 0, 10).subscribe({
      next: (res: any) => { this.clientes = res.data?.list ?? []; this.buscandoCliente = false; },
      error: () => { this.buscandoCliente = false; }
    });
  }

  seleccionarCliente(c: IClienteBusquedaDto): void {
    this.clienteSeleccionado = c;
    this.terminoCliente = `${c.nombrePersona} ${c.apeidoPaterno}`;
    this.clientes = [];
  }

  limpiarCliente(): void { this.clienteSeleccionado = null; this.terminoCliente = ''; this.clientes = []; }

  // ── Cobrar — un solo request ───────────────────────────────────────

  cobrar(): void {
    if (!this.puedeCobrar) return;

    if (this.clienteSeleccionado) {
      this.clienteResolvedId = this.clienteSeleccionado.id;
      this.ejecutarVenta(this.clienteResolvedId);
    } else {
      // Sin cliente → usar el cliente del admin logueado
      this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
        next: (res: any) => {
          if (res) {
            this.clienteResolvedId = res as number;
            this.ejecutarVenta(this.clienteResolvedId);
          } else {
            Swal.fire({ icon: 'warning', title: 'Sin perfil de cliente', text: 'El administrador no tiene un perfil de cliente registrado.' });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error al obtener el cliente.' })
      });
    }
  }

  private ejecutarVenta(clienteId: number): void {
    this.procesando = true;

    const request: IVentaDirectaRequest = {
      usuarioId:     this.idUsuario,
      clienteId,
      pagosYMesesId: this.pagosYMesesId!,
      detalles: this.lineas.map(l => ({
        productoId:  l.variante.productoId ?? 0,
        varianteId:  l.variante.id,
        cantidad:    l.cantidad,
        precioVenta: l.variante.precio ?? 0,
        subTotal:    l.subTotal
      }))
    };

    this.varianteService.saveVentaDirecta(request).subscribe({
      next: (res: IVentaDirectaResponse) => {
        this.procesando = false;
        if (!res.requiereTerminal) {
          // Efectivo / Transferencia → venta confirmada
          this.varianteService.invalidarCache();
          Swal.fire({
            icon: 'success',
            title: `¡Venta #${res.ventaId} registrada!`,
            text: res.descripcionPago,
            timer: 2200,
            showConfirmButton: false
          });
          this.limpiarTodo();
        } else {
          // Tarjeta → mostrar panel de terminal
          this.ventaCreada     = res;
          this.mostrarTerminal = true;
          this.estadoTerminal  = 'idle';
        }
      },
      error: () => {
        this.procesando = false;
        Swal.fire({ icon: 'error', title: 'Error al procesar la venta.' });
      }
    });
  }

  // ── Terminal Mercado Pago ──────────────────────────────────────────

  enviarATerminal(): void {
    if (!this.ventaCreada) return;
    this.estadoTerminal = 'procesando';

    const request: ITerminalIniciarRequest = {
      pedidoId:      this.ventaCreada.ventaId,
      clienteId:     this.clienteSeleccionado?.id ?? this.clienteResolvedId,
      pagosYMesesId: this.pagosYMesesId!,
      cuotas:        this.mesesSeleccionado?.cuotas ?? 1,
      totalMonto:    this.ventaCreada.totalVenta,
      descripcion:   `Venta directa #${this.ventaCreada.ventaId}`
    };

    this.pagoService.iniciarPagoTerminal(request).subscribe({
      next: res => { this.intentId = res.intentId; this.startPolling(res.intentId); },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.mensaje ?? err.error?.message ?? 'Error al conectar con la terminal.';
        this.errorTerminal  = msg;
        this.estadoTerminal = err.status === 429 ? 'bloqueado' : 'rechazado';
      }
    });
  }

  cancelarTerminal(): void {
    this.stopPolling();
    if (this.intentId) this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    this.estadoTerminal = 'cancelado';
    this.intentId = null;
  }

  cerrarTerminal(): void {
    this.stopPolling();
    this.mostrarTerminal = false;
    this.ventaCreada     = null;
    this.estadoTerminal  = 'idle';
  }

  private startPolling(intentId: string): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.pagoService.getEstadoTerminal(intentId).subscribe({
        next: res => {
          if (res.estado === 'FINISHED') {
            this.stopPolling();
            this.estadoTerminal = 'aprobado';
            this.varianteService.invalidarCache();
            const vId = this.ventaCreada?.ventaId;
            setTimeout(() => {
              Swal.fire({ icon: 'success', title: `¡Pago aprobado! Venta #${vId}`, timer: 2000, showConfirmButton: false });
              this.limpiarTodo();
            }, 800);
          } else if (res.estado === 'CANCELED') {
            this.stopPolling();
            this.estadoTerminal = 'cancelado';
          }
        },
        error: () => { this.stopPolling(); this.estadoTerminal = 'rechazado'; }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollingInterval !== null) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
  }
}
