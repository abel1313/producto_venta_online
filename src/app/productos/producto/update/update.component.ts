import { Component, OnInit } from '@angular/core';
import { ImagenUpdateDto, IProductoDTO } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTOImagenes, IProductoDTORec } from '../models/producto.dto.model';
import { ImagenesService } from 'src/app/imagene/imagenes.service';
import { ProductoImagenDto } from '../models/ProductoImagenDto.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss']
})
export class UpdateComponent implements OnInit {

  productoActualizar: IProductoDTOImagenes | null = null;
  productoImagenesDto: ProductoImagenDto | null = null;
  constructor(
    private readonly serviceProducto: ProductoService,
    private readonly imagenService: ImagenesService
  ) { }

  ngOnInit(): void {
    this.serviceProducto.productoUpdate$.subscribe((producto) => {
      this.productoActualizar = producto;
    });

    this.imagenService.getDataGeneric<ProductoImagenDto>(this.productoActualizar?.idProducto || 0).subscribe(img => {
      this.productoImagenesDto = img;
    },
      error => {
        console.error(error)
      });
  }
  eliminarImagen(imagen: ImagenUpdateDto): void {
    const index = this.productoImagenesDto?.listaImagenes.indexOf(imagen) || 0;
    if (index > -1) {
      this.productoImagenesDto?.listaImagenes.splice(index, 1);
    }

    this.imagenService.deleteById<any>(imagen.id).subscribe(eliminado => {
      Swal.fire({
        title: eliminado.data,
        icon: "success",
        draggable: true
      });
    }, error => {
      console.error(error);
    });

  }

}
