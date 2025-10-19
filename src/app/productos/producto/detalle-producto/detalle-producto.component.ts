import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IProductoDTO, IProductoPaginable } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IconService } from 'src/app/Icon/icon.service';
import { IDetalleProducto } from 'src/app/models';
import { CarritoService } from 'src/app/services/carrito/carrito.service';

@Component({
  selector: 'app-detalle-producto',
  templateUrl: './detalle-producto.component.html',
  styleUrls: ['./detalle-producto.component.scss']
})
export class DetalleProductoComponent implements OnInit {
  idProducto!: number;
  products: Product[] | any;
  paginacion?: IProductoPaginable<IProductoDTO[]>;
  responsiveOptions: any[] | any;

  productoDtoImagen: ProductImagenDto[] | any;
 producto: any;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: ProductoService,
    public readonly serviceIcon: IconService,
    public iconImagen: IconService,
    private readonly serviceCarrito: CarritoService
  ) { }

  ngOnInit(): void {
  this.idProducto = +this.route.snapshot.paramMap.get('id')!;
  this.service.getDataImg(this.idProducto, 0, 4).subscribe(data => {
    this.productoDtoImagen = data.list;
    this.totalPaginas = data.totalPaginas;
    this.paginasCargadas.add(0);
    this.cargaInicialCompletada = true;
  });

    this.serviceCarrito.carritoDetalle$.subscribe(detalle => {
    this.detalle = detalle;
  });

  this.service.getDataGeneric(this.idProducto).subscribe(data=>{
    this.producto = data;
    console.log(this.producto)
  });
    this.service.getProductsSmall().then(data => {
      this.products = data.slice(0, 9);
    });

    this.responsiveOptions = [
      {
        breakpoint: '1400px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '1199px',
        numVisible: 3,
        numScroll: 1
      },
      {
        breakpoint: '767px',
        numVisible: 2,
        numScroll: 1
      },
      {
        breakpoint: '575px',
        numVisible: 1,
        numScroll: 1
      }
    ]

  }

    detalle: IDetalleProducto[] = [];
    isProductoEnCarrito(): boolean {
    return this.detalle.some(item =>
       item?.codigoBarras === this.producto?.codigoBarras && item.nombre === this.producto.nombre
    );
  }
addCarrito() {
  const { idProducto, nombre, descripcion, stock, precioVenta, codigoBarras } = this.producto;
  const prod: IDetalleProducto = {
    idProducto,
    nombre,
    descripcion,
    stock,
    precioVenta,
    codigoBarras,
    cantidad: 1,
    total: precioVenta
  };

  this.serviceCarrito.agregarProducto(prod);
}
  
removeCarrito() {
  this.serviceCarrito.eliminarProducto(this.producto);
}

  cargaInicialCompletada = false;

  currentPage = 0;
  totalPaginas: number = 0;
  paginasValidas: number[] = [];
  paginasCargadas = new Set<number>();

handlePageChange(event: any) {
  if (!this.cargaInicialCompletada) return;

  const puntoSeleccionado = event.page;

  // Si ya cargaste todas las páginas, no hay nada más que hacer
  if (this.paginasCargadas.size >= this.totalPaginas) return;

  // Si el punto seleccionado coincide con una página válida aún no cargada
  if (!this.paginasCargadas.has(puntoSeleccionado) && puntoSeleccionado < this.totalPaginas) {
    this.cargarPagina(puntoSeleccionado);
    return;
  }

  // Si el punto seleccionado es mayor que las páginas válidas, busca la siguiente página no cargada
  for (let i = 0; i < this.totalPaginas; i++) {
    if (!this.paginasCargadas.has(i)) {
      this.cargarPagina(i);
      break;
    }
  }
}



cargarPagina(pagina: number) {
  this.paginasCargadas.add(pagina);

  this.service.getDataImg(this.idProducto, pagina, 4).subscribe(data => {
    const nuevasImagenes = Array.isArray(data.list)
      ? data.list.filter((nueva: ProductImagenDto) =>
          !this.productoDtoImagen.some((existente: ProductImagenDto) => existente.idImagen === nueva.idImagen)
        )
      : [];

    this.productoDtoImagen = [...this.productoDtoImagen, ...nuevasImagenes];
  }, error => {
    this.paginasCargadas.delete(pagina); // liberar si falló
    console.error(error);
  });
}



  getSeverity(status: string) {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warn';
      case 'OUTOFSTOCK':
        return 'danger';
      default: "danger"
    }

    return 'danger';
  }


}
export interface Product {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  inventoryStatus?: string;
  category?: string;
  image?: string;
  rating?: number;
}


export interface PageableDto {
  list: ProductImagenDto[];
  totalPaginas: number;
}
export interface ProductImagenDto {
  idProducto?: string;
  idImagen?: string;
  name?: string;
  price?: number;
  inventoryStatus?: string;
  extencion?: string;
  image?: string;
}