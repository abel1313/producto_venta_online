import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { IProductoPaginable } from 'src/app/productos/producto/models';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { IUsuarioDto } from '../models/usuario.dto';

@Component({
  selector: 'app-buscar-usuarios',
  templateUrl: './buscar-usuarios.component.html',
  styleUrls: ['./buscar-usuarios.component.scss']
})
export class BuscarUsuariosComponent implements OnInit {
buscarProd: string = '';
paginaPrimera: number = 1;
@Output() regresarProductos = new EventEmitter<IProductoPaginable<IUsuarioDto[]>>();
@Input() irABase: boolean = false;
  constructor(private usuarioService: UsuarioService) { }

  ngOnInit(): void {
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

    buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;
    if (this.buscarProd == '') {
      this.paginaPrimera = 1;
    }
    this.buscarProductoSinKey(this.paginaPrimera, this.buscarProd);
  }

   buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    this.usuarioService.getDataPage(paginaPrimera, 10,buscarProd)//no es
      .subscribe({
        next: (res: any) => {
          this.regresarProductos.emit(res);
        },
        error: (err) => {
          console.error('Error en la petición:', err);
        }
      });
  }
}
