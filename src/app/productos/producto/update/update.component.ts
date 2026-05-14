import { Component, OnDestroy, OnInit } from '@angular/core';
import { ImagenUpdateDto } from '../models';
import { ProductoService } from '../../service/producto.service';
import { IProductoDTORec } from '../models/producto.dto.model';
import { ProductoImagenDto } from '../models/ProductoImagenDto.model';
import { ImagenesService } from 'src/app/imagene/imagenes.service';
import Swal from 'sweetalert2';

export interface ImagenVista {
  dto: ImagenUpdateDto;
  src: string;
  cargando: boolean;
  error: boolean;
}

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss']
})
export class UpdateComponent implements OnInit, OnDestroy {

  productoActualizar: IProductoDTORec | null = null;
  imagenesVista: ImagenVista[] = [];
  cargandoImagenes = false;
  eliminando = new Set<string>();

  private objectUrls: string[] = [];

  constructor(
    private readonly serviceProducto: ProductoService,
    private readonly imagenService: ImagenesService
  ) { }

  ngOnInit(): void {
    this.serviceProducto.productoUpdate$.subscribe(producto => {
      this.productoActualizar = producto as IProductoDTORec | null;
      if (producto?.idProducto) {
        this.cargarImagenes(producto.idProducto);
      }
    });
  }

  private cargarImagenes(idProducto: number): void {
    this.cargandoImagenes = true;
    this.imagenesVista = [];

    this.imagenService.getDataGeneric<ProductoImagenDto>(idProducto).subscribe({
      next: (data) => {
        this.cargandoImagenes = false;
        if (!data?.listaImagenes?.length) return;

        this.imagenesVista = data.listaImagenes.map(dto => ({
          dto,
          src: '',
          cargando: true,
          error: false
        }));

        this.imagenesVista.forEach((item, i) => {
          this.imagenService.getImagenFile(item.dto.id).subscribe({
            next: url => {
              this.objectUrls.push(url);
              this.imagenesVista[i].src = url;
              this.imagenesVista[i].cargando = false;
            },
            error: () => {
              this.imagenesVista[i].cargando = false;
              this.imagenesVista[i].error = true;
            }
          });
        });
      },
      error: () => {
        this.cargandoImagenes = false;
      }
    });
  }

  eliminarImagen(item: ImagenVista): void {
    if (this.eliminando.has(item.dto.id)) return;

    Swal.fire({
      title: '¿Eliminar imagen?',
      text: item.dto.nombreImagen,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#1e1b4b',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.eliminando.add(item.dto.id);

      this.imagenService.deleteById<{ data: string }>(item.dto.id).subscribe({
        next: (res) => {
          this.eliminando.delete(item.dto.id);
          this.imagenesVista = this.imagenesVista.filter(v => v.dto.id !== item.dto.id);
          Swal.fire({ icon: 'success', title: res?.data ?? 'Imagen eliminada', timer: 1500, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        },
        error: () => {
          this.eliminando.delete(item.dto.id);
          Swal.fire({ icon: 'error', title: 'Error al eliminar', timer: 2000, showConfirmButton: false, background: '#1e1b4b', color: '#fff' });
        }
      });
    });
  }

  estaEliminando(id: string): boolean {
    return this.eliminando.has(id);
  }

  ngOnDestroy(): void {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
  }
}
