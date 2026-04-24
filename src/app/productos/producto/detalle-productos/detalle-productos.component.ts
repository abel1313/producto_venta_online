import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IDetalleProducto } from 'src/app/models';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { IClienteBusquedaDto, IDetallePedidos, IDetallePedidosDTOPedido, IPedidos, IPedidosDTOPedido, IPageableClientes } from './models/index.model';
import { InitCliente } from 'src/app/clietes/mis-datos/models/inicializarClases.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { PedidosService } from 'src/app/shared/pedidos.service';
import { ProductoService } from 'src/app/productos/service/producto.service';

@Component({
  selector: 'app-detalle-productos',
  templateUrl: './detalle-productos.component.html',
  styleUrls: ['./detalle-productos.component.scss']
})
export class DetalleProductosComponent implements OnInit, OnDestroy {
  roles: string[] = [];
  isAdminUser: boolean = false;
  detalleProducto: IDetalleProducto[] = [];
  totalProducto: number = 0;
  idUsuario: number = 0;

  // Búsqueda de clientes
  nombreBusqueda: string = '';
  clientes: IClienteBusquedaDto[] = [];
  totalClientes: number = 0;
  pageClientes: number = 0;
  sizeClientes: number = 10;
  cargandoClientes: boolean = false;
  clienteSeleccionado: IClienteBusquedaDto | null = null;
  busquedaIniciada: boolean = false;

  private inputBusqueda$ = new Subject<string>();
  private subBusqueda!: Subscription;

  pedido: IPedidos = {
    cliente: InitCliente.initCliente(),
    estadoPedido: 'pendiente',
    fechaPedido: new Date(),
    observaciones: '',
    detalles: []
  }

  pedidosDTO: IPedidosDTOPedido = {
    cliente: {
      id: 0
    },
    estadoPedido: 'pendiente',
    fechaPedido: new Date(),
    observaciones: '',
    detalles: []
  }
  // ── Visor de imagen ────────────────────────────────────────────────
  mostrarVisor   = false;
  imagenVisor    = '';
  nombreVisor    = '';
  cargandoImagen = false;

  constructor(
    private readonly serviceCarrito: CarritoService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly clienteServoce: ClienteService,
    private readonly pedidosService: PedidosService,
    private readonly productoService: ProductoService
  ) { }

  verImagen(detalle: IDetalleProducto): void {
    this.cargandoImagen = true;
    this.productoService.getDataGeneric<any>(detalle.idProducto).subscribe({
      next: (res: any) => {
        const img = res?.data?.imagen ?? res?.imagen;
        this.imagenVisor = (img?.imagen && img?.contentType)
          ? `data:${img.contentType};base64,${img.imagen}`
          : '';
        this.nombreVisor    = detalle.nombre;
        this.mostrarVisor   = true;
        this.cargandoImagen = false;
      },
      error: () => {
        this.imagenVisor    = '';
        this.nombreVisor    = detalle.nombre;
        this.mostrarVisor   = true;
        this.cargandoImagen = false;
      }
    });
  }

  cerrarVisor(): void { this.mostrarVisor = false; }

  ngOnInit(): void {
    this.authService.userId$.subscribe(idUser => {
      this.idUsuario = idUser;
    });

    this.serviceCarrito.carritoDetalle$.subscribe(carrito => {
      this.detalleProducto = carrito;
      this.totalProducto = this.detalleProducto.reduce((sum, prod) => {
        return sum + (prod.cantidad * prod.precioVenta);
      }, 0);
    });

    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    this.subBusqueda = this.inputBusqueda$.pipe(
      filter(v => v.trim().length >= 3),
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.busquedaIniciada = true;
      this.pageClientes = 0;
      this.cargarClientes();
    });
  }

  ngOnDestroy(): void {
    this.subBusqueda?.unsubscribe();
  }

  onInputBusqueda() {
    this.inputBusqueda$.next(this.nombreBusqueda);
  }


  generarPedido() {
    if (this.isAnonymous) {
      Swal.fire({
        title: "Generar pedido",
        icon: "info",
        html: `
        <p>Para poder generar un pedido es necesario registrarse.</p>
        `,
        showCancelButton: true,
        confirmButtonText: "Ir a registro",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33"
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/usuarios/registrar']);
        }
      });
    } else {

      if (this.clienteSeleccionado) {
        this.pedidosDTO.cliente.id = this.clienteSeleccionado.id;
        this.armarYConfirmarPedido();
      } else {
        if (this.idUsuario === 0) {
          Swal.fire({
            title: "Usuario no encontrado",
            icon: "error",
            text: "El usuario no esta registrado, intente de nuevo",
            showCancelButton: false
          });
          return;
        }
        this.clienteServoce.getDataOneCliente(this.idUsuario).subscribe((dataCliente: any) => {
          if (dataCliente && dataCliente.data) {
            this.pedidosDTO.cliente.id = dataCliente.data.id;
            this.armarYConfirmarPedido();
          } else {
            Swal.fire({
              title: "Error",
              icon: "error",
              text: "El usuario no esta registrado, intente de nuevo",
              showCancelButton: false
            });
          }
        }, () => {
          Swal.fire({
            title: "Error",
            icon: "error",
            text: "Ocurrio un error",
            showCancelButton: false
          });
        });
      }
    }

  }

  private armarYConfirmarPedido() {
    this.pedidosDTO.detalles = [];
    this.detalleProducto.forEach(fr => {
      this.pedidosDTO.detalles.push({
        producto: { id: fr.idProducto },
        cantidad: fr.cantidad,
        precioUnitario: fr.precioVenta,
        subTotal: fr.total
      });
    });

    Swal.fire({
      title: "Pedido",
      icon: "info",
      html: `<p>Desea generar su pedido</p>`,
      showCancelButton: true,
      confirmButtonText: "Generar pedido",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33"
    }).then((result) => {
      if (result.isConfirmed) {
        this.pedidosService.saveDataPedido(this.pedidosDTO).subscribe(ped => {
          this.serviceCarrito.limpiarCarrito();
          if (ped != null && ped.code == 200) {
            Swal.fire({
              title: "Pedido registrado",
              icon: "success",
              text: "Se registro su pedido con el numero de rastreo " + ped.data.id,
              showCancelButton: false
            });
          }
        }, () => {
          Swal.fire({
            title: "Error",
            icon: "error",
            text: "Ocurrio un error al guardar el pedido",
            showCancelButton: false
          });
        });
      }
    });
  }

  buscarClientes() {
    if (!this.nombreBusqueda.trim()) return;
    this.busquedaIniciada = true;
    this.pageClientes = 0;
    this.cargarClientes();
  }

  cargarClientes() {
    this.cargandoClientes = true;
    this.clienteServoce.buscarClientes(this.nombreBusqueda, this.pageClientes, this.sizeClientes)
      .subscribe({
        next: (res) => {
          if (res?.data) {
            this.clientes = res.data.list ?? [];
            this.totalClientes = res.data.totalElementos ?? 0;
          }
          this.cargandoClientes = false;
        },
        error: () => {
          this.cargandoClientes = false;
        }
      });
  }

  onLazyLoadClientes(event: any) {
    if (!this.busquedaIniciada) return;
    this.pageClientes = event.first / event.rows;
    this.sizeClientes = event.rows;
    this.cargarClientes();
  }

  seleccionarCliente(cliente: IClienteBusquedaDto) {
    this.clienteSeleccionado = cliente;
    this.pedidosDTO.cliente.id = cliente.id;
  }

  limpiarClienteSeleccionado() {
    this.clienteSeleccionado = null;
    this.pedidosDTO.cliente.id = 0;
  }

  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }

}
