import { Component, OnInit } from '@angular/core';
import { PedidosService } from '../pedidos.service';
import { IPedidoGenerico } from './models/IPedidoGenerico.model';
import { ClienteService } from 'src/app/clietes/cliente.service';
import { AuthService } from 'src/app/auth/auth.service';
import { ResponseGeneric } from 'src/shared/generic-response.mode';
import { IPageable } from './models/IPageable.mode';
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
    data: {
      list: [],
      totalPaginas: 0
    },
    lista: [],
    mensaje: ''
  }
  idUsuario: number = 0;
  clienteId: number = 0;
  constructor(private readonly pedidoService: PedidosService,
    private readonly clienteService: ClienteService,
    private readonly authService: AuthService) { }

  ngOnInit(): void {

    this.authService.userId$.subscribe(idUser => {
      this.idUsuario = idUser;
    });
    this.authService.userRoles$.subscribe(roles => {
      this.roles = roles;
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

    if (this.isAdminUser) {
      this.buscarPedidoAdmin();
    } else {
      this.clienteService.getDataOneCliente(this.idUsuario).subscribe((data: any) => {
        // console.log(data, 'datatatatatatata')
        if (data && data.data) {
          this.clienteId = data.data.id;
          this.page = 0;
          this.size = 10;
          this.cargarMasPedidos()
        }
      });
    }


  }

  item: IPedidoGenerico = {
    cliente: {
      id: 0,
      correoElectronico: '',
      nombreCliente: '',
      numeroTelefonico: ''
    },
    pedido: {
      detalles: [],
      estado_pedido: '',
      fecha_pedido: '',
      id: 0
    }
  };

  irDetalle(item: IPedidoGenerico) {
    console.log('ir detalle')
    this.mostrarDetalle = true;
    this.item = item;
  }
  cancelarPedido(item: IPedidoGenerico) {
    Swal.fire({
      title: "Cancelar pedido",
      icon: "error",
      html: `
            <p>Desea cancelar el pedido ${item.pedido.id}</p>
            `,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "No",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33"
    }).then((result) => {
      if (result.isConfirmed) {
        this.pedidoService.deleteData(item.pedido.id).subscribe(dell => {
          this.page = 0;
          this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
          Swal.fire({
            title: "El pedido se cancelo correctamente",
            icon: 'success',
            draggable: true
          });
        }, err => {
          Swal.fire({
            title: "Ocurrio un error al eliminar el pedido, intente de nuevo",
            icon: 'error',
            draggable: true
          });
        });
      }
    });
  }

  cobrarAdmin(item: IPedidoGenerico) {

    console.log(item)
    Swal.fire({
      title: "Cancelar pedido",
      icon: "error",
      html: `
            <p>Desea cancelar el pedido ${item.pedido.id}</p>
            `,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "No",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33"
    }).then((result) => {
      if (result.isConfirmed) {
        item.pedido.estado_pedido = 'confirmado';
        this.pedidoService.updateService(item.pedido.id, item).subscribe(dell => {
          this.page = 0;
          this.pedidoGenerico = this.pedidoGenerico.filter(p => p.pedido.id !== item.pedido.id);
          Swal.fire({
            title: "El pedido se cancelo correctamente",
            icon: 'success',
            draggable: true
          });
        }, err => {
          Swal.fire({
            title: "Ocurrio un error al eliminar el pedido, intente de nuevo",
            icon: 'error',
            draggable: true
          });
        });
      }
    });
  }

  page = 0;
  size = 10;
  cargando = false;

  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

    if (atBottom && !this.cargando) {
      if (this.isAdminUser) {

      } else {
        this.cargarMasPedidos();
      }
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
    this.pedidoService.getDataOnePedido(this.clienteId, this.size, this.page)
      .subscribe(sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...this.resposeGenericPedido.data?.list || []);
        this.page++;
        this.cargando = false;

      }, err => {
        console.log(err);
      });
  }

  buscarProductos(event: KeyboardEvent) {

    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;

    if (this.isAdminUser) {
      this.buscarPedidoAdmin();

    } else {
      if (this.buscarProd == '') {
        this.cargarMasPedidos()
      } else {

        let pedido = 0;
        if (!isNaN(Number(this.buscarProd))) {
          pedido = Number(this.buscarProd);

          this.cargando = true;
          this.pedidoService.getDataOnePedidoById(pedido, this.clienteId, 10, 0)
            .subscribe(sus => {
              this.resposeGenericPedido = sus;
              console.log(this.resposeGenericPedido.data?.list)

              this.pedidoGenerico = this.resposeGenericPedido.data?.list || [];
              this.page++;
              this.cargando = false;

            }, err => {
              console.log(err);
            });


        } else {
          Swal.fire({
            title: 'Ingrese el numero de pedido',
            icon: 'info',
            draggable: false
          });
          return;
        }
      }
    }
  }

  mostrarProductos(mostrar: boolean): void {
    console.log('regresando ')
    this.mostrarDetalle = mostrar;
  }

  buscarPedidoAdmin() {
    console.log(this.buscarProd === '', "noelleva")
    this.size = 10;
    this.page = 0;
    this.pedidoService.buscarPedidoPorCliente(this.buscarProd == '' ? 'vacio' : this.buscarProd, this.size, this.page)
      .subscribe(sus => {
        this.resposeGenericPedido = sus;
        this.pedidoGenerico.push(...this.resposeGenericPedido.data?.list || []);
        this.page++;
        this.cargando = false;

      }, err => {
        console.log(err);
      });
  }
}
