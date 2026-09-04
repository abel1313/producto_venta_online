import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { IProductoPaginable } from 'src/app/productos/producto/models';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { IUsuarioDto } from '../models/usuario.dto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buscar-usuarios',
  templateUrl: './buscar-usuarios.component.html',
  styleUrls: ['./buscar-usuarios.component.scss']
})
export class BuscarUsuariosComponent implements OnInit {
buscarProd: string = '';
paginaPrimera: number = 1;
mostrandoInactivos: boolean = false;
@Output() regresarProductos = new EventEmitter<IProductoPaginable<IUsuarioDto[]>>();
@Output() modoCambio = new EventEmitter<boolean>();
@Input() irABase: boolean = false;
  constructor(private usuarioService: UsuarioService) { }

  ngOnInit(): void {
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

    buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value;
    this.buscarProd = texto;
    if (this.buscarProd == '') {
      this.paginaPrimera = 1;
    }
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

  // Alterna entre ver los usuarios activos (default) o los desactivados (soft-delete), para
  // poder reactivar a alguien sin tocar la base a mano.
  toggleInactivos(): void {
    this.mostrandoInactivos = !this.mostrandoInactivos;
    this.paginaPrimera = 1;
    this.modoCambio.emit(this.mostrandoInactivos);
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

   buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    this.usuarioService.getDataPage(paginaPrimera, 10, buscarProd, !this.mostrandoInactivos)
      .subscribe({
        next: (res: any) => {
          this.regresarProductos.emit(res);
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error al buscar', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo buscar el usuario.' });
        }
      });
  }
}
