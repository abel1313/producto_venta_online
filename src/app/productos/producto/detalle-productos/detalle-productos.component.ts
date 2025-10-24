import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { Component, OnInit } from '@angular/core';
import { IDetalleProducto } from 'src/app/models';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

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
  constructor(
    private readonly serviceCarrito: CarritoService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.serviceCarrito.carritoDetalle$.subscribe(carrito => {
      this.detalleProducto = carrito;
      this.totalProducto = this.detalleProducto.reduce((sum, prod) => {
        console.log(sum, 'carrrrrr')
        console.log(prod, 'carrrrrr')
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

    }

  }

  get isAnonymous(): boolean {
    return !this.roles || this.roles.length === 0;
  }

}
