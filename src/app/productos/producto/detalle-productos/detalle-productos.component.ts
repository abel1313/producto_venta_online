import { UsuarioService } from './../../../shared/usuario.service';
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
    estadoPedido: 'Pendiente',
    fechaPedido: new Date(),
    fechaRecogida: null,
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
    private readonly productoService: ProductoService,
    private readonly usuarioService: UsuarioService
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
    // ⚠️ Antes esto disparaba `buscarClientePorIdUsuario` de forma asíncrona y, en la misma
    // llamada, evaluaba `existeClientePorIdUsuario` de forma SÍNCRONA sin esperar la respuesta
    // (esa bandera arrancaba en `false` y solo se actualizaba dentro del `.subscribe()`, que para
    // entonces ya no había corrido). Resultado: casi cualquier usuario registrado con cliente ya
    // dado de alta caía igual al `if` de "hace falta registrarse" y se le mandaba a
    // `/usuarios/registrar` en vez de dejarlo generar el pedido. Además se llamaba dos veces al
    // mismo endpoint (una para esa bandera rota, otra dentro del `else` para el `clienteId` real).
    // Ahora: `isAnonymous` (síncrono, no depende de ninguna llamada) decide primero; si hay un
    // cliente ya asignado (admin, desde el buscador de abajo) se usa directo; si no, se hace UNA
    // sola llamada y se decide todo dentro de su `.subscribe()`.
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
      return;
    }

    if (this.clienteSeleccionado) {
      this.pedidosDTO.cliente.id = this.clienteSeleccionado.id;
      this.armarYConfirmarPedido();
      return;
    }

    if (this.idUsuario === 0) {
      Swal.fire({
        title: "Usuario no encontrado",
        icon: "error",
        text: "El usuario no esta registrado, intente de nuevo",
        showCancelButton: false
      });
      return;
    }

    // Se usa `buscarClientePorIdUsuario` (no `getDataOneCliente(idUsuario)`): aquí solo hace
    // falta el **clienteId**, y es la misma traducción que ya usan `venta-variante` y el
    // configurador de ramos para armar un pedido.
    this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
      error: () => this.errorLeerCliente(),
      next: (clienteId: any) => {
        if (!clienteId) {
          this.pedirCompletarRegistro();
          return;
        }
        // ⚠️ Que exista el vínculo Usuario→Cliente (id truthy) NO es lo mismo que "puede
        // comprar": al verificar su correo, todo usuario nuevo recibe un Cliente auto-creado
        // con id real pero nombre/apellido/teléfono vacíos (`datosCompletos=false` -- ver
        // `Cliente.recalcularDatosCompletos()` en el back). El propio back rechaza el pedido en
        // ese caso (`PedidoServiceImpl.savePedido`), pero es mejor no dejar avanzar al usuario a
        // "Generar pedido" para que le salga un error genérico -- se revisa antes.
        this.clienteServoce.getDataOneCliente(clienteId).subscribe({
          error: () => this.errorLeerCliente(),
          next: (res) => {
            if (res?.data?.datosCompletos) {
              this.pedidosDTO.cliente.id = clienteId;
              this.armarYConfirmarPedido();
            } else {
              this.pedirCompletarRegistro();
            }
          }
        });
      }
    });
  }

  private errorLeerCliente(): void {
    Swal.fire({
      title: 'No pudimos completar tu pedido',
      icon: 'error',
      text: 'No logramos leer tus datos de cliente. Revisa "Mis datos" e inténtalo de nuevo.'
    });
  }

  private pedirCompletarRegistro(): void {
    Swal.fire({
      title: 'Completa tu registro',
      icon: 'info',
      text: 'Para comprar necesitamos tus datos de cliente.',
      showCancelButton: true,
      confirmButtonText: 'Completar mis datos',
      cancelButtonText: 'Ahora no'
    }).then(r => { if (r.isConfirmed) this.router.navigate(['/clientes/agregar']); });
  }

  private armarYConfirmarPedido() {
    this.pedidosDTO.detalles = [];
    this.detalleProducto.forEach(fr => {
      const esVariante = fr.varianteId != null;
      this.pedidosDTO.detalles.push({
        producto: { id: esVariante ? 0 : fr.idProducto },
        cantidad: fr.cantidad,
        precioUnitario: fr.precioVenta,
        subTotal: fr.total,
        varianteId: fr.varianteId ?? null
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
        this.pedidosService.saveDataPedido(this.pedidosDTO).subscribe({
          next: (ped) => {
            if (ped?.data != null) {
              this.serviceCarrito.limpiarCarrito();
              Swal.fire({
                title: "Pedido registrado",
                icon: "success",
                text: "Se registró su pedido con el número de rastreo " + ped.data.id,
                showCancelButton: false
              });
            } else {
              Swal.fire({
                title: "Error",
                icon: "error",
                text: ped?.mensaje ?? "Ocurrió un error al guardar el pedido",
                showCancelButton: false
              });
            }
          },
          error: (err) => {
            // Red de seguridad: aunque ya se filtra `datosCompletos` antes de llegar aquí, el
            // back es la fuente de verdad (ej. el cliente pudo perder la verificación de correo
            // entre el check y el guardado) -- se interpreta su mensaje en vez de mostrar siempre
            // el genérico, para mandar al usuario al lugar correcto igual que arriba.
            const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
            if (msg.toLowerCase().includes('completar tus datos')) {
              this.pedirCompletarRegistro();
            } else {
              Swal.fire({
                title: "Error",
                icon: "error",
                text: msg || "Ocurrió un error al guardar el pedido",
                showCancelButton: false
              });
            }
          }
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
