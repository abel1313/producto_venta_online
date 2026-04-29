import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IProductoDTO, IProductoPaginable } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IconService } from 'src/app/Icon/icon.service';
import { IDetalleProducto } from 'src/app/models';
import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from 'src/app/auth/auth.service';
import { ImagenesService } from 'src/app/imagene/imagenes.service';
import Swal from 'sweetalert2';

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
  // ── Eliminación por lotes (solo admin) ───────────────────────────
  isAdminUser = false;
  imagenesParaEliminar = new Set<string>();
  eliminando = false;
  get totalMarcadas(): number { return this.imagenesParaEliminar.size; }

  cargando = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly service: ProductoService,
    public readonly serviceIcon: IconService,
    public iconImagen: IconService,
    private readonly serviceCarrito: CarritoService,
    private readonly confirmationService: ConfirmationService,
    private readonly authService: AuthService,
    private readonly imagenesService: ImagenesService,
  ) { }

  ngOnInit(): void {
    this.authService.userRoles$.subscribe(roles => {
      this.isAdminUser = roles.includes('ROLE_ADMIN');
    });

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
    this.cargando = false;
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

  volver(): void { this.router.navigate(['/productos/buscar']); }

  get cantidadEnCarrito(): number {
    if (!this.producto) return 0;
    return this.detalle.find(i => i.codigoBarras === this.producto.codigoBarras)?.cantidad ?? 0;
  }

  get stockAgotado(): boolean {
    if (!this.producto) return true;
    return this.cantidadEnCarrito >= this.producto.stock;
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

toggleMarcar(img: ProductImagenDto): void {
    if (!img.idImagen) return;
    if (this.imagenesParaEliminar.has(img.idImagen)) {
      this.imagenesParaEliminar.delete(img.idImagen);
    } else {
      this.imagenesParaEliminar.add(img.idImagen);
    }
  }

  estaMarcada(img: ProductImagenDto): boolean {
    return !!img.idImagen && this.imagenesParaEliminar.has(img.idImagen);
  }

  confirmarEliminarBatch(): void {
    if (this.imagenesParaEliminar.size === 0) return;
    Swal.fire({
      title: `¿Eliminar ${this.imagenesParaEliminar.size} imagen(es)?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#1e1b4b',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.eliminando = true;
      const ids = Array.from(this.imagenesParaEliminar);
      this.imagenesService.eliminarImagenesBatch(this.idProducto, ids).subscribe({
        next: () => {
          this.productoDtoImagen = this.productoDtoImagen.filter(
            (img: ProductImagenDto) => !img.idImagen || !this.imagenesParaEliminar.has(img.idImagen)
          );
          this.imagenesParaEliminar.clear();
          this.eliminando = false;
          Swal.fire({ icon: 'success', title: 'Imágenes eliminadas', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        },
        error: () => {
          this.eliminando = false;
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        }
      });
    });
  }

  eliminarImagen(product: ProductImagenDto) {
  this.confirmationService.confirm({
    message: '¿Estás seguro de que deseas eliminar esta imagen?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, eliminar',
    rejectLabel: 'Cancelar',
    accept: () => {
      this.service.deleteImagen(product.idImagen!).subscribe({
        next: () => {
          this.productoDtoImagen = this.productoDtoImagen.filter(
            (img: ProductImagenDto) => img.idImagen !== product.idImagen
          );
        },
        error: (err) => console.error('Error al eliminar imagen', err)
      });
    }
  });
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