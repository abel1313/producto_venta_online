import { Component, Input, OnInit } from '@angular/core';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTO, IProductoPaginable } from '../models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-busca',
  templateUrl: './busca.component.html',
  styleUrls: ['./busca.component.scss']
})
export class BuscaComponent implements OnInit {

  buscarProd:string = '';
  paginacionBuscar?: IProductoPaginable<IProductoDTO[]>;
    @Input() itemAgregar?: string = 'AgregarProd';
    @Input() itemEliminar?: string = 'DeleteProd';
    @Input() styleTableWidth1?: string = '100%';
    @Input() styleTableheight1?: string = '400px';
  constructor(
    private readonly service: ProductoService
  ) { }

  ngOnInit(): void {
    if (this.service.prodInitialized) {
      this.paginacionBuscar = {
        t:              this.service.prodCache,
        totalPaginas:   this.service.prodTotalCache,
        pagina:         this.service.prodPaginaCache,
        totalRegistros: this.service.prodCache.length
      };
    }
    // Sin cache → AllComponent maneja la carga inicial con obtenerProductos
  }


  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;

    this.buscarPorNombreCodigoPostal(1,10,this.buscarProd);
    
  }

  buscarPorNombreCodigoPostal(pagina: number, size: number, nombre: string): void {
    this.service.getDataNombreCodigoBarra(pagina, size, nombre).subscribe({
      next: (res) => {
        this.paginacionBuscar = res;
        this.service.setProdCache(res.t ?? [], pagina, res.totalPaginas ?? 0, nombre);
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error al buscar', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo buscar el producto.' });
      }
    });
  }

}
