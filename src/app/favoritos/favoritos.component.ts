import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { IVarianteResumen } from '../variante/models/variante.model';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';
import { FavoritoService } from './service/favorito.service';

@Component({
  selector: 'app-favoritos',
  templateUrl: './favoritos.component.html',
  styleUrls: ['./favoritos.component.scss']
})
export class FavoritosComponent implements OnInit {

  variantes: IVarianteResumen[] = [];
  cargando = false;
  pagina = 1;
  totalPaginas = 1;

  /**
   * El back exige **perfil de cliente completo** para usar favoritos y responde
   * "Tu cuenta todavia no tiene un perfil de cliente completo".
   *
   * Antes eso salía como un Swal rojo de "Error" apenas entrabas — sin decirte qué hacer y como
   * si algo estuviera roto. No está roto: te falta un paso. Ahora la pantalla lo explica y te
   * manda a completarlo.
   */
  faltaPerfilCliente = false;

  constructor(
    private readonly favoritoService: FavoritoService,
    private readonly carritoVariante: CarritoVarianteService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargar(1);
  }

  cargar(pagina: number): void {
    this.cargando = true;
    this.favoritoService.listar(pagina, 12).subscribe({
      next: res => {
        this.variantes    = res?.data?.t ?? [];
        this.totalPaginas = res?.data?.totalPaginas ?? 1;
        this.pagina       = pagina;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
        if (msg.toLowerCase().includes('perfil de cliente')) {
          this.faltaPerfilCliente = true;
          return; // se explica en pantalla, sin popup de error
        }
        Swal.fire({ icon: 'error', title: 'Error', text: msg || 'No se pudieron cargar tus favoritos.' });
      }
    });
  }

  irACompletarPerfil(): void {
    this.router.navigate(['/clientes/agregar']);
  }

  anteriorPagina(): void {
    if (this.pagina > 1) this.cargar(this.pagina - 1);
  }

  siguientePagina(): void {
    if (this.pagina < this.totalPaginas) this.cargar(this.pagina + 1);
  }

  quitarFavorito(v: IVarianteResumen): void {
    this.favoritoService.quitar(v.id).subscribe({
      next: () => {
        this.variantes = this.variantes.filter(x => x.id !== v.id);
        if (this.variantes.length === 0 && this.pagina > 1) this.cargar(this.pagina - 1);
      },
      error: err => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo quitar de favoritos.' })
    });
  }

  agregarCarrito(v: IVarianteResumen): void {
    const ok = this.carritoVariante.agregar(v);
    if (!ok) {
      Swal.fire({ icon: 'warning', title: 'Sin stock', text: 'No hay más unidades disponibles.', timer: 1800, showConfirmButton: false });
    }
  }

  eliminarCarrito(v: IVarianteResumen): void {
    this.carritoVariante.eliminar(v.id);
  }

  estaEnCarrito(v: IVarianteResumen): boolean {
    return this.carritoVariante.estaEnCarrito(v.id);
  }

  cantidadEnCarrito(v: IVarianteResumen): number {
    return this.carritoVariante.cantidadEnCarrito(v.id);
  }

  stockAgotado(v: IVarianteResumen): boolean {
    const stock = v.stock ?? 0;
    return stock === 0 || this.cantidadEnCarrito(v) >= stock;
  }

  // Igual que en el catálogo: se manda el `productoId` para que la ficha no llame a `getOne`
  // (ADMIN-only desde 2026-08-11) y no se rompa para un cliente.
  irDetalle(v: IVarianteResumen): void {
    this.router.navigate(['/tienda/detalle', v.id], {
      queryParams: v.productoId ? { productoId: v.productoId } : {}
    });
  }

  verCarrito(): void {
    this.router.navigate(['/tienda/carrito']);
  }
}
