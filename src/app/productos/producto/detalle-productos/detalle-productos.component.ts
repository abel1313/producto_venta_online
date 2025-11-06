import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { Component, OnInit } from '@angular/core';
import { IDetalleProducto } from 'src/app/models';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { IDetallePedidos, IDetallePedidosDTOPedido, IPedidos, IPedidosDTOPedido } from './models/index.model';
import { InitCliente } from 'src/app/clietes/mis-datos/models/inicializarClases.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { PedidosService } from 'src/app/shared/pedidos.service';

@Component({
  selector: 'app-detalle-productos',
  templateUrl: './detalle-productos.component.html',
  styleUrls: ['./detalle-productos.component.scss']
})
export class DetalleProductosComponent implements OnInit {
  roles: string[] = [];
  isAdminUser: boolean = false;
  detalleProducto: IDetalleProducto[] = [];
  totalProducto: number = 0;
  idUsuario: number = 0;
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
  constructor(
    private readonly serviceCarrito: CarritoService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly clienteServoce: ClienteService,
    private readonly pedidosService: PedidosService
  ) { }

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
  }


  generarPedido() {

    console.log(this.isAnonymous)
    console.log(this.roles)
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

      if (this.idUsuario != 0) {

      } else {
        Swal.fire({
          title: "Usuario no encontrado",
          icon: "error",
          text: "El usuario no esta registrado, intente de nuevo",
          showCancelButton: false
        });
      }
      this.clienteServoce.getDataOneCliente(this.idUsuario).subscribe((dataCliente: any) => {

        if (dataCliente && dataCliente.data) {
          this.detalleProducto.forEach(fr => {

            const {
              idProducto,
              cantidad,
              codigoBarras,
              precioVenta,
              total
            } = fr;

            const datosDetalle: IDetallePedidosDTOPedido = {
              producto: {
                id: idProducto
              },
              cantidad: cantidad,
              precioUnitario: precioVenta,
              subTotal: total
            }
            this.pedidosDTO.detalles.push(datosDetalle);
          });
          this.pedidosDTO.cliente.id = dataCliente.data.id;



          Swal.fire({
            title: "Pedido",
            icon: "info",
            html: `
        <p>Desea generar su pedido</p>
        `,
            showCancelButton: true,
            confirmButtonText: "Generar pedido",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33"
          }).then((result) => {
            if (result.isConfirmed) {
              this.pedidosService.saveDataPedido(this.pedidosDTO).subscribe(ped => {
                console.log(ped, ' --------------------------------------------------------- ')
                this.serviceCarrito.limpiarCarrito();

                if (ped != null && ped.code == 200) {
                  Swal.fire({
                    title: "Pedido registrado",
                    icon: "success",
                    text: "Se registro su pedido con el numero de rastreo "+ ped.data.id,
                    showCancelButton: false
                  });
                }

              }, err => {
                Swal.fire({
                  title: "Error",
                  icon: "error",
                  text: "Ocurrio un error al guardar el pedido",
                  showCancelButton: false
                });
              });
            }
          });


        } else {
          Swal.fire({
            title: "Error",
            icon: "error",
            text: "El usuario no esta registrado, intente de nuevo",
            showCancelButton: false
          });
        }


      }, err => {
        Swal.fire({
          title: "Error",
          icon: "error",
          text: "Ocurrio un error ",
          showCancelButton: false
        });
      });
    }

  }

  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }

}
