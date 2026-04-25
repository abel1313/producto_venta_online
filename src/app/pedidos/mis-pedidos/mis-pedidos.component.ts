import { Component, OnInit } from '@angular/core';
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

  constructor(
    private readonly pedidoService: PedidosService,
    private readonly clienteService: ClienteService,
    private readonly authService: AuthService,
    private readonly pagoService: PagoService
  ) {}

  ngOnInit(): void {
    this.authService.userId$.subscribe(idUser => { this.idUsuario = idUser; });
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
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
    Swal.fire({
      title: 'Cancelar pedido',
      icon: 'error',
      html: `<p>Desea cancelar el pedido ${item.pedido.id}</p>`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'No',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then(result => {
      if (result.isConfirmed) {
        this.pedidoService.deleteData(item.pedido.id).subscribe(
          () => {
            this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
            Swal.fire({ title: 'El pedido se cancelo correctamente', icon: 'success', draggable: true });
          },
          () => Swal.fire({ title: 'Ocurrio un error al eliminar el pedido, intente de nuevo', icon: 'error', draggable: true })
        );
      }
    });
  }

  cobrarAdmin(item: IPedidoGenerico) {
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
      () => {
        this.mostrarDialogoCobro = false;
        Swal.fire({ title: 'Ocurrio un error al cobrar el pedido, intente de nuevo', icon: 'error', draggable: true });
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
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
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
    this.pedidoService.buscarPedidoPorCliente(this.buscarProd === '' ? 'vacio' : this.buscarProd, this.size, this.page)
      .subscribe(sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...(this.resposeGenericPedido.data?.list || []));
        this.page++;
        this.cargando = false;
      }, err => console.error(err));
  }
}
