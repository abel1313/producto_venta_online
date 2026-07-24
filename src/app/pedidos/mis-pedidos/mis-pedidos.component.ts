import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PedidosService } from '../pedidos.service';
import { IPedidoGenerico } from './models/IPedidoGenerico.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { AuthService } from 'src/app/auth/auth.service';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPageable } from './models/IPageable.mode';
import { PagoService } from '../pago.service';
import { IOpcionMesesDto, IOpcionPagoDto, ITerminalIniciarRequest } from './models/IPago.model';
import Swal from 'sweetalert2';
import { generarHtmlTicket, imprimirTicket, ITicketData } from 'src/app/shared/ticket.util';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import { motivoCancelacionSwalFragment, MOTIVOS_CANCELACION } from 'src/app/shared/motivo-cancelacion.util';
import { LugarEntregaService } from 'src/app/lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from 'src/app/lugares-entrega/models/lugar-entrega.model';

@Component({
  selector: 'app-mis-pedidos',
  templateUrl: './mis-pedidos.component.html',
  styleUrls: ['./mis-pedidos.component.scss']
})
export class MisPedidosComponent implements OnInit {
  roles: string[] = [];
  isAdminUser: boolean = false;
  buscarProd: string = '';
  mostrarDetalle: boolean = false;
  pedidoGenerico: IPedidoGenerico[] = [];
  resposeGenericPedido: ResponseGeneric<IPageable<IPedidoGenerico[]>> = {
    code: 0,
    data: { list: [], totalPaginas: 0 },
    lista: [],
    mensaje: ''
  };
  idUsuario: number = 0;
  clienteId: number = 0;

  // --- Diálogo de cobro ---
  mostrarDialogoCobro: boolean = false;
  pedidoACobrar: IPedidoGenerico | null = null;

  opcionesEstructuradas: IOpcionPagoDto[] = [];
  tipoPagoActivo: IOpcionPagoDto | null = null;
  mesesSeleccionado: IOpcionMesesDto | null = null;
  pagosYMesesId: number | null = null;

  // Terminal Mercado Pago
  estadoTerminal: 'idle' | 'procesando' | 'aprobado' | 'rechazado' | 'cancelado' | 'bloqueado' = 'idle';
  errorTerminal: string | null = null;
  intentId: string | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  imprimiendoTicket: { [id: number]: boolean } = {};
  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;

  // ── Filtro por lugar de entrega (autocomplete, solo admin) ──────────────
  lugares: ILugarEntrega[] = [];
  terminoLugar = '';
  lugaresFiltrados: ILugarEntrega[] = [];
  mostrarDropdownLugar = false;
  lugarFiltroId: number | null = null;

  constructor(
    private readonly pedidoService: PedidosService,
    private readonly clienteService: ClienteService,
    private readonly authService: AuthService,
    private readonly pagoService: PagoService,
    private readonly negocioService: NegocioService,
    private readonly router: Router,
    private readonly lugarEntregaService: LugarEntregaService
  ) {}

  ngOnInit(): void {
    this.authService.userId$.subscribe(idUser => { this.idUsuario = idUser; });
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl || null; this.qrFacebook = c.facebookUrl || null; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });

    // Catálogo de lugares — lo necesita cualquier usuario (admin filtra la lista, cualquiera
    // puede elegir lugar en el modal de "Entrega" de su propio pedido).
    this.lugarEntregaService.getAll().subscribe({
      next: data => { this.lugares = data; },
      error: () => {}
    });

    if (this.isAdminUser) {
      this.buscarPedidoAdmin();
    } else {
      this.clienteService.getDataOneCliente(this.idUsuario).subscribe((data: any) => {
        if (data && data.data) {
          this.clienteId = data.data.id;
          this.page = 0;
          this.size = 10;
          this.cargarMasPedidos();
        }
      });
    }
  }

  item: IPedidoGenerico = {
    cliente: { id: 0, correoElectronico: '', nombreCliente: '', numeroTelefonico: '' },
    pedido: { detalles: [], estado_pedido: '', fecha_pedido: '', id: 0 }
  };

  irDetalle(item: IPedidoGenerico) {
    this.mostrarDetalle = true;
    this.item = item;
  }

  cancelarPedido(item: IPedidoGenerico) {
    // Ya entregado = devolución (el back ahora sí permite cancelar en este estado, pero solo
    // admin y sin NO_SE_PRESENTO como motivo — el cliente sí cumplió, solo se devuelve el
    // producto). El botón que dispara esto ya está protegido con !isAdminUser en el HTML.
    const esDevolucion = item.pedido.estado_pedido === 'Entregado';
    const opciones = esDevolucion ? MOTIVOS_CANCELACION.filter(o => o.value !== 'NO_SE_PRESENTO') : undefined;

    // Grupo de botones en vez del input:'radio' nativo de SweetAlert2 (se veía como checklist
    // feo) — mismos motivos, mismo patrón visual de pills que el resto del proyecto.
    const motivoFrag = motivoCancelacionSwalFragment(opciones);

    Swal.fire({
      title: esDevolucion ? '¿Cancelar (devolución) este pedido ya entregado?' : '¿Por qué cancelas este pedido?',
      html: `<p style="color:var(--app-text-muted,#6b7280);margin:0 0 4px">Pedido #${item.pedido.id}</p>${motivoFrag.html}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cancelar pedido',
      cancelButtonText: 'No cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      didOpen: motivoFrag.didOpen,
      preConfirm: motivoFrag.preConfirm
    }).then(result => {
      if (result.isConfirmed) {
        this.pedidoService.cancelarConMotivo(item.pedido.id, result.value).subscribe({
          next: () => {
            this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
            Swal.fire({ title: 'Pedido cancelado correctamente', icon: 'success', timer: 1600, showConfirmButton: false });
          },
          error: (err) => Swal.fire({ title: 'Error al cancelar el pedido', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cancelar el pedido.', icon: 'error' })
        });
      }
    });
  }

  // Modal (Swal) para capturar/editar nombreReceptor, direccionEntrega, fechaEntrega y
  // observaciones — PUT /v1/pedidos/{id}/entrega, no requiere admin (cualquiera puede editar
  // su propio pedido), el back solo lo rechaza si el pedido ya está "cancelado".
  abrirInfoEntrega(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;

    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => this.mostrarModalEntrega(pedidoId, r?.data ?? null),
      error: () => this.mostrarModalEntrega(pedidoId, null)
    });
  }

  private mostrarModalEntrega(pedidoId: number, actual: PedidoDetalleResponse | null): void {
    const nombreReceptor   = actual?.nombreReceptor ?? '';
    const direccionEntrega = actual?.direccionEntrega ?? '';
    const fechaEntrega     = actual?.fechaRecogida ?? '';
    const observaciones    = actual?.observaciones ?? '';
    const lugarEntregaId   = actual?.lugarEntregaId ?? null;
    const urlFacebook      = actual?.urlFacebook ?? '';

    const opcionesLugar = this.lugares.map(l =>
      `<option value="${l.id}" ${l.id === lugarEntregaId ? 'selected' : ''}>${l.nombre}</option>`
    ).join('');

    Swal.fire({
      title: `📍 Info de entrega — Pedido #${pedidoId}`,
      html: `
        <div style="text-align:left;display:flex;flex-direction:column;gap:4px">
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Nombre de quien recibe</label>
          <input id="sw-receptor" class="swal2-input" style="margin:0 0 6px" placeholder="Opcional" value="${nombreReceptor}">
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Dirección de entrega</label>
          <textarea id="sw-direccion" class="swal2-textarea" style="margin:0 0 6px" placeholder="Opcional">${direccionEntrega}</textarea>
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Fecha de entrega</label>
          <input id="sw-fecha" type="date" class="swal2-input" style="margin:0 0 6px" value="${fechaEntrega}">
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Lugar de entrega</label>
          <select id="sw-lugar" class="swal2-select" style="margin:0 0 6px">
            <option value="">Sin especificar</option>
            ${opcionesLugar}
          </select>
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Link de Facebook</label>
          <input id="sw-facebook" class="swal2-input" style="margin:0 0 6px" placeholder="Opcional" value="${urlFacebook}">
          <label style="font-size:.82rem;color:var(--app-text-muted,#6b7280)">Observaciones</label>
          <textarea id="sw-obs" class="swal2-textarea" style="margin:0" placeholder="Opcional">${observaciones}</textarea>
        </div>`,
      showCancelButton: true,
      confirmButtonText: '💾 Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => ({
        nombreReceptor:   (document.getElementById('sw-receptor') as HTMLInputElement)?.value?.trim() || undefined,
        direccionEntrega: (document.getElementById('sw-direccion') as HTMLTextAreaElement)?.value?.trim() || undefined,
        fechaEntrega:     (document.getElementById('sw-fecha') as HTMLInputElement)?.value || undefined,
        lugarEntregaId:   Number((document.getElementById('sw-lugar') as HTMLSelectElement)?.value) || undefined,
        urlFacebook:      (document.getElementById('sw-facebook') as HTMLInputElement)?.value?.trim() || undefined,
        observaciones:    (document.getElementById('sw-obs') as HTMLTextAreaElement)?.value?.trim() || undefined
      })
    }).then(result => {
      if (!result.isConfirmed) return;
      this.pedidoService.actualizarEntrega(pedidoId, result.value).subscribe({
        next: () => Swal.fire({ icon: 'success', title: 'Datos de entrega guardados', timer: 1800, showConfirmButton: false }),
        error: err => Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo guardar la información de entrega.' })
      });
    });
  }

  cobrarAdmin(item: IPedidoGenerico) {
    // APARTADO/FIADO no se cobran con este diálogo — el back rechaza
    // PUT /v1/pedidos/confirmar/{id} para esos tipos ("se liquidan mediante abonos").
    // ⚠️ `item.pedido.tipoPedido` viene de la LISTA (buscarClientePedido) — ese campo
    // nunca se confirmó en el spec del back para ese endpoint (solo para savePedido,
    // ventas/save y los reportes de abonos), así que puede llegar undefined aunque el
    // pedido SÍ sea crédito. Por eso el chequeo real se hace contra el DETALLE
    // (GET /{id}/detalle), que sí está confirmado — el de la lista solo se usa como
    // atajo optimista para no pedir el detalle en pedidos NORMAL (el caso más común).
    if (item.pedido.tipoPedido === 'APARTADO' || item.pedido.tipoPedido === 'FIADO') {
      this.irACobrarCredito(item, item.pedido.tipoPedido);
      return;
    }

    this.pedidoService.getDetallePedido(item.pedido.id).subscribe({
      next: r => {
        const tp = r?.data?.tipoPedido;
        if (tp === 'APARTADO' || tp === 'FIADO') {
          this.irACobrarCredito(item, tp);
        } else {
          this.abrirDialogoCobroNormal(item);
        }
      },
      // Si falla el detalle, no bloquear el cobro normal — se sigue con el flujo de
      // siempre; si en realidad era crédito, el back lo rechazará y el usuario lo verá.
      error: () => this.abrirDialogoCobroNormal(item)
    });
  }

  private irACobrarCredito(item: IPedidoGenerico, tipo: 'APARTADO' | 'FIADO'): void {
    Swal.fire({
      icon: 'info',
      title: tipo === 'APARTADO' ? 'Pedido apartado' : 'Pedido a crédito (ir pagando)',
      text: 'Este pedido se cobra registrando un abono, no desde este botón.',
      showCancelButton: true,
      confirmButtonText: 'Ir a Créditos / Abonos',
      cancelButtonText: 'Cerrar'
    }).then(res => {
      if (res.isConfirmed) {
        this.router.navigate(['/abonos'], { queryParams: { pedidoId: item.pedido.id } });
      }
    });
  }

  private abrirDialogoCobroNormal(item: IPedidoGenerico): void {
    this.pedidoACobrar = item;
    this.resetDialogo();

    this.pagoService.getOpcionesEstructuradas().subscribe(res => {
      this.opcionesEstructuradas = res.data ?? [];
      this.mostrarDialogoCobro = true;
    });
  }

  seleccionarTipoPago(opcion: IOpcionPagoDto) {
    this.tipoPagoActivo = opcion;
    this.mesesSeleccionado = null;

    if (!opcion.mostrarMeses) {
      this.pagosYMesesId = opcion.pagosYMesesId;
    } else {
      this.pagosYMesesId = null;
    }
  }

  seleccionarMeses(opcion: IOpcionMesesDto) {
    this.mesesSeleccionado = opcion;
    this.pagosYMesesId = opcion.pagosYMesesId;
  }

  confirmarCobro() {
    if (!this.pedidoACobrar) return;

    const item = this.pedidoACobrar;
    item.pedido.estado_pedido = 'Entregado';
    item.pagosYMesesId = this.pagosYMesesId ?? 0;
    this.pedidoService.updateService(item.pedido.id, item).subscribe(
      () => {
        this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
        this.mostrarDialogoCobro = false;
        Swal.fire({ title: 'Pedido cobrado correctamente', icon: 'success', draggable: true });
      },
      (err) => {
        this.mostrarDialogoCobro = false;
        // Red de seguridad: si el back rechaza porque el pedido en realidad es
        // crédito (APARTADO/FIADO), ofrecer el mismo redirect a Abonos en vez del
        // error genérico — cubre el caso donde ni el campo de la lista ni el
        // detalle lo detectaron a tiempo.
        const msg: string = (err?.error?.mensaje ?? err?.error?.message ?? '').toLowerCase();
        if (msg.includes('abono') || msg.includes('apartado') || msg.includes('fiado')) {
          this.irACobrarCredito(item, item.pedido.tipoPedido === 'APARTADO' ? 'APARTADO' : 'FIADO');
          return;
        }
        Swal.fire({ title: 'Ocurrio un error al cobrar el pedido, intente de nuevo', text: err?.error?.mensaje ?? err?.error?.message ?? '', icon: 'error', draggable: true });
      }
    );
  }

  cancelarDialogo() {
    this.stopPolling();
    if (this.intentId && this.estadoTerminal === 'procesando') {
      this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    }
    this.mostrarDialogoCobro = false;
    this.resetDialogo();
  }

  private resetDialogo() {
    this.opcionesEstructuradas = [];
    this.tipoPagoActivo = null;
    this.mesesSeleccionado = null;
    this.pagosYMesesId = null;
    this.estadoTerminal = 'idle';
    this.errorTerminal = null;
    this.intentId = null;
  }

  get esTarjeta(): boolean {
    if (this.tipoPagoActivo == null) return false;
    if (this.tipoPagoActivo.requiereTerminal != null) return this.tipoPagoActivo.requiereTerminal;
    const f = (this.tipoPagoActivo.formaPago ?? '').toLowerCase();
    return f.includes('tarjeta') || f.includes('debito') || f.includes('débito')
        || f.includes('credito') || f.includes('crédito')
        || this.tipoPagoActivo.mostrarMeses;
  }

  get totalPedido(): number {
    return (this.pedidoACobrar?.pedido.detalles ?? [])
      .reduce((sum, d) => sum + d.sub_total, 0);
  }

  get puedeEnviarTerminal(): boolean {
    if (!this.esTarjeta) return false;
    if (this.tipoPagoActivo?.mostrarMeses) return this.mesesSeleccionado !== null;
    return this.pagosYMesesId !== null;
  }

  get puedeConfirmar(): boolean {
    if (this.esTarjeta) return false;
    return this.pagosYMesesId !== null;
  }

  enviarATerminal(): void {
    if (!this.pedidoACobrar || !this.pagosYMesesId) return;
    this.estadoTerminal = 'procesando';

    const request: ITerminalIniciarRequest = {
      pedidoId:      this.pedidoACobrar.pedido.id,
      clienteId:     this.pedidoACobrar.cliente.id,
      pagosYMesesId: this.pagosYMesesId,
      cuotas:        this.mesesSeleccionado?.cuotas ?? 1,
      totalMonto:    this.totalPedido,
      descripcion:   `Pedido #${this.pedidoACobrar.pedido.id}`
    };

    this.pagoService.iniciarPagoTerminal(request).subscribe({
      next: res => {
        this.intentId = res.intentId;
        this.startPolling(res.intentId);
      },
      error: (err: HttpErrorResponse) => {
        const msg: string = err.error?.mensaje ?? err.error?.message ?? 'Error al conectar con la terminal.';
        this.errorTerminal = msg;
        this.estadoTerminal = err.status === 429 ? 'bloqueado' : 'rechazado';
      }
    });
  }

  cancelarTerminal(): void {
    this.stopPolling();
    if (this.intentId) {
      this.pagoService.cancelarPagoTerminal(this.intentId).subscribe();
    }
    this.estadoTerminal = 'cancelado';
    this.intentId = null;
  }

  private startPolling(intentId: string): void {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.pagoService.getEstadoTerminal(intentId).subscribe({
        next: res => {
          if (res.estado === 'FINISHED') {
            this.stopPolling();
            this.estadoTerminal = 'aprobado';
            this.confirmarCobro();
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
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  page = 0;
  size = 10;
  cargando = false;

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    if (atBottom && !this.cargando) {
      if (!this.isAdminUser) this.cargarMasPedidos();
    }
  }

  totalPaginas: number = 0;

  cargarMasPedidos(): void {
    if (this.page <= this.totalPaginas) {
      this.cargando = true;
      this.cargarPedidosDesdeBase();
    }
  }

  cargarPedidosDesdeBase() {
    this.pedidoService.getDataOnePedido(this.clienteId, this.size, this.page).subscribe(
      sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...(this.resposeGenericPedido.data?.list || []));
        this.page++;
        this.cargando = false;
      },
      err => console.error(err)
    );
  }

  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value;
    this.buscarProd = texto;

    if (this.isAdminUser) {
      this.buscarPedidoAdmin();
    } else {
      if (this.buscarProd === '') {
        this.cargarMasPedidos();
      } else {
        const pedido = Number(this.buscarProd);
        if (!isNaN(pedido) && pedido > 0) {
          this.cargando = true;
          this.pedidoService.getDataOnePedidoById(pedido, this.clienteId, 10, 0).subscribe(
            sus => {
              this.resposeGenericPedido = sus;
              this.pedidoGenerico = this.resposeGenericPedido.data?.list || [];
              this.page++;
              this.cargando = false;
            },
            err => console.error(err)
          );
        } else {
          Swal.fire({ title: 'Ingrese el numero de pedido', icon: 'info', draggable: false });
        }
      }
    }
  }

  mostrarProductos(mostrar: boolean): void {
    this.mostrarDetalle = mostrar;
  }

  buscarPedidoAdmin() {
    this.size = 10;
    this.page = 0;
    // Cada búsqueda/filtro nuevo reemplaza la lista — antes se acumulaba con push() sin
    // limpiar primero, así que tecla a tecla se iban duplicando los resultados viejos.
    this.pedidoGenerico = [];
    this.pedidoService.buscarPedidoPorCliente(this.buscarProd ?? '', this.size, this.page, this.lugarFiltroId)
      .subscribe(sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...(this.resposeGenericPedido.data?.list || []));
        this.page++;
        this.cargando = false;
      }, err => console.error(err));
  }

  // ── Filtro por lugar de entrega (autocomplete simple, catálogo pequeño → filtrado local) ──
  onBuscarLugar(): void {
    const t = this.terminoLugar.trim().toLowerCase();
    this.lugaresFiltrados = t
      ? this.lugares.filter(l => l.nombre.toLowerCase().includes(t))
      : this.lugares;
    this.mostrarDropdownLugar = true;
  }

  seleccionarLugar(l: ILugarEntrega): void {
    this.lugarFiltroId = l.id;
    this.terminoLugar = l.nombre;
    this.mostrarDropdownLugar = false;
    this.buscarPedidoAdmin();
  }

  limpiarFiltroLugar(): void {
    this.lugarFiltroId = null;
    this.terminoLugar = '';
    this.mostrarDropdownLugar = false;
    this.buscarPedidoAdmin();
  }

  // El (mousedown) de seleccionarLugar() necesita disparar ANTES que este (blur) — un delay
  // corto es el patrón estándar para que el clic en el dropdown no se pierda.
  cerrarDropdownLugarConDelay(): void {
    setTimeout(() => { this.mostrarDropdownLugar = false; }, 200);
  }

  // Para crédito el back guarda estado_pedido = 'APARTADO'/'FIADO' (el mismo valor que
  // tipoPedido) hasta liquidarlo — mostrar ese texto crudo en el badge de estado repite
  // exactamente lo que ya dice el badge de tipo ("📦 Apartado" + "APARTADO" abajo). Para
  // crédito se muestra el estado de pago en su lugar; NORMAL/Cancelado no cambian.
  estadoBadge(item: IPedidoGenerico): { icono: string; texto: string } {
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO' || tp === 'FIADO') {
      return item.pedido.estado_pedido === 'PAGADO'
        ? { icono: 'pi-check-circle', texto: 'Pagado' }
        : { icono: 'pi-clock', texto: 'Por cobrar' };
    }
    const icono = item.pedido.estado_pedido === 'Entregado' ? 'pi-check-circle'
      : item.pedido.estado_pedido === 'Cancelado' ? 'pi-times-circle' : 'pi-clock';
    return { icono, texto: item.pedido.estado_pedido };
  }

  // Pre-checa con lo que YA hay en la lista (sin pedir el detalle): para NORMAL basta
  // con estado_pedido; para crédito no sabemos si ya tiene abonos sin pedir el detalle,
  // así que se deja habilitado y se valida de verdad en puedeImprimir() al hacer clic.
  puedeGenerarTicket(item: IPedidoGenerico): boolean {
    const tp = item.pedido.tipoPedido;
    if (tp === 'APARTADO' || tp === 'FIADO') return true;
    return item.pedido.estado_pedido === 'Entregado';
  }

  // Chequeo real, con el detalle completo — cubre el caso crédito sin abonos que
  // puedeGenerarTicket() no puede detectar de antemano.
  private puedeImprimir(d: PedidoDetalleResponse): boolean {
    const esCredito = d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO';
    if (esCredito) {
      return d.estadoPedido === 'PAGADO' || (d.totalPagado ?? 0) > 0 || (d.abonos?.length ?? 0) > 0;
    }
    return d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO';
  }

  imprimirTicketPedido(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;
    if (this.imprimiendoTicket[pedidoId]) return;

    this.imprimiendoTicket[pedidoId] = true;
    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        this.imprimiendoTicket[pedidoId] = false;
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }
        if (!this.puedeImprimir(d)) {
          Swal.fire({ icon: 'info', title: 'Todavía no hay ningún pago', text: 'Este pedido aún no se ha cobrado/recogido, o no tiene abonos registrados — no hay nada que imprimir todavía.' });
          return;
        }

        if (d.metodoPago || d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO') {
          // Se muestra un botón de confirmación dedicado y se imprime en su propio .then():
          // window.open() solo escapa al bloqueador de popups si ocurre síncrono a un
          // clic del usuario, no dentro del callback de una petición HTTP.
          Swal.fire({
            title: `Ticket pedido #${pedidoId}`,
            text: '¿Deseas imprimir el ticket?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimir ticket',
            cancelButtonText: 'Cancelar'
          }).then(swRes => {
            if (swRes.isConfirmed) this.buildAndPrintTicket(d, item, d.metodoPago ?? '', d.montoDado ?? null);
          });
          return;
        }

        // Pedido NORMAL antiguo sin metodoPago guardado en BD → preguntar
        Swal.fire({
          title: `Ticket pedido #${pedidoId}`,
          text: '¿Cómo se pagó este pedido?',
          icon: 'question',
          input: 'radio',
          inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
          inputValue: 'EFECTIVO',
          showCancelButton: true,
          confirmButtonText: 'Imprimir 🖨️',
          cancelButtonText: 'Cancelar',
          inputValidator: v => (!v ? 'Selecciona la forma de pago' : null)
        }).then(swRes => {
          if (swRes.isConfirmed) this.buildAndPrintTicket(d, item, swRes.value, null);
        });
      },
      error: err => {
        this.imprimiendoTicket[pedidoId] = false;
        Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el ticket.', icon: 'error' });
      }
    });
  }

  private formatearFechaTicket(d: PedidoDetalleResponse): string | undefined {
    const fecha = d.fechaHoraRegistro || d.fechaPedido;
    if (!fecha) return undefined;
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  private buildAndPrintTicket(d: PedidoDetalleResponse, item: IPedidoGenerico, metodoPago: string, montoDadoOrig: number | null): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const montoDado = metodoPago === 'EFECTIVO' && montoDadoOrig ? montoDadoOrig : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    imprimirTicket(generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || item.cliente.nombreCliente,
      metodoPago,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({
        cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal
      })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook
    }));
  }

  enviarCorreoPedido(item: IPedidoGenerico): void {
    const pedidoId = item.pedido.id;

    // Carga el detalle primero para conocer correo/método de pago registrados
    this.pedidoService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }
        if (!this.puedeImprimir(d)) {
          Swal.fire({ icon: 'info', title: 'Todavía no hay ningún pago', text: 'Este pedido aún no se ha cobrado/recogido, o no tiene abonos registrados — no hay nada que enviar todavía.' });
          return;
        }
        const correoDefault = d.clienteCorreo || item.cliente.correoElectronico || '';

        if (correoDefault) {
          Swal.fire({
            title: `Enviar comprobante #${pedidoId}`,
            html: `¿Enviar el ticket al correo de <b>${item.cliente.nombreCliente}</b>:<br><b>${correoDefault}</b>?`,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Sí, enviar',
            denyButtonText: 'Usar otro correo',
            cancelButtonText: 'Cancelar'
          }).then(res => {
            if (res.isConfirmed) this.pedirMetodoYEnviar(pedidoId, item, d, correoDefault);
            else if (res.isDenied) this.pedirCorreoManualYEnviar(pedidoId, item, d);
          });
        } else {
          this.pedirCorreoManualYEnviar(pedidoId, item, d);
        }
      },
      error: err => Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el comprobante.', icon: 'error' })
    });
  }

  private pedirMetodoYEnviar(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse, correo: string): void {
    if (d.metodoPago) {
      this.enviarComprobanteConDatos(pedidoId, item, d, correo, d.metodoPago);
      return;
    }
    Swal.fire({
      title: 'Forma de pago',
      input: 'select',
      inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
      inputValue: 'EFECTIVO',
      showCancelButton: true,
      confirmButtonText: 'Enviar correo 📧',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) this.enviarComprobanteConDatos(pedidoId, item, d, correo, res.value);
    });
  }

  private pedirCorreoManualYEnviar(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse): void {
    const metodoPagoKnown = d.metodoPago ?? null;
    const selectHtml = metodoPagoKnown ? '' : `
      <select id="sw-metodo" class="swal2-select" style="margin-top:8px">
        <option value="EFECTIVO">Efectivo</option>
        <option value="TRANSFERENCIA">Transferencia</option>
        <option value="TARJETA">Tarjeta</option>
      </select>`;

    Swal.fire({
      title: `Enviar comprobante #${pedidoId}`,
      html: `<input id="sw-correo" type="email" class="swal2-input" placeholder="correo@ejemplo.com">${selectHtml}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar correo 📧',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const correo = (document.getElementById('sw-correo') as HTMLInputElement)?.value?.trim();
        if (!correo || !correo.includes('@')) { Swal.showValidationMessage('Ingresa un correo válido'); return false; }
        const metodo = metodoPagoKnown ?? (document.getElementById('sw-metodo') as HTMLSelectElement)?.value ?? 'EFECTIVO';
        return { correo, metodo };
      }
    }).then(swRes => {
      if (!swRes.isConfirmed || !swRes.value) return;
      const { correo, metodo } = swRes.value as { correo: string; metodo: string };
      this.enviarComprobanteConDatos(pedidoId, item, d, correo, metodo);
    });
  }

  private enviarComprobanteConDatos(pedidoId: number, item: IPedidoGenerico, d: PedidoDetalleResponse, correo: string, metodo: string): void {
    const montoDado = metodo === 'EFECTIVO' && d.montoDado ? d.montoDado : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';

    const html = generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || item.cliente.nombreCliente,
      metodoPago:     metodo,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook
    });

    this.pedidoService.reenviarComprobante(pedidoId, { correo, ticketHtml: html }).subscribe({
      next: (res: any) => Swal.fire({
        title: '¡Correo enviado!',
        text: res?.data ?? `Comprobante enviado a ${correo}`,
        icon: 'success', timer: 2500, showConfirmButton: false
      }),
      error: err => Swal.fire({ title: 'Error al enviar correo', text: err?.error?.mensaje ?? 'No se pudo enviar el comprobante.', icon: 'error' })
    });
  }
}
