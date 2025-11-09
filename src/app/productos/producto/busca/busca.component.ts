import { Component, Input, OnInit } from '@angular/core';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTO, IProductoPaginable } from '../models';

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
  }


  buscarProductos(event: KeyboardEvent) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.buscarProd = texto;

    this.buscarPorNombreCodigoPostal(1,10,this.buscarProd);
    
  }

  buscarPorNombreCodigoPostal(pagina:number,size:number,nombre:string): void{
    
    this.service.getDataNombreCodigoBarra(pagina,size,nombre).subscribe({
      next: (res) => {
        this.paginacionBuscar = res;
      },
      error: (err) => {
        console.error('Error en la petición:', err);
      }
    });
  }

}
