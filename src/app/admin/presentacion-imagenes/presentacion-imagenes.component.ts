import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { PresentacionService, IImagenPresentacion } from 'src/app/presentacion/presentacion.service';

@Component({
  selector: 'app-presentacion-imagenes',
  templateUrl: './presentacion-imagenes.component.html',
  styleUrls: ['./presentacion-imagenes.component.scss']
})
export class PresentacionImagenesComponent implements OnInit {

  imagenes: IImagenPresentacion[] = [];
  cargando  = true;
  guardandoId: number | null = null;

  constructor(private readonly presentacionService: PresentacionService) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.presentacionService.getTodasImagenes().subscribe({
      next: (imgs: any) => { this.imagenes = imgs.data; this.cargando = imgs.data.activo; },
      error: ()  => { this.cargando = false; }
    });
  }

  get login():    IImagenPresentacion[] { return this.imagenes.filter(i => i.tipo === 'LOGIN'); }
  get registro(): IImagenPresentacion[] { return this.imagenes.filter(i => i.tipo === 'REGISTRO'); }

  guardar(img: IImagenPresentacion): void {
    this.guardandoId = img.id;
    this.presentacionService.actualizarImagen(img.id, {
      urlImagen:   img.urlImagen,
      descripcion: img.descripcion,
      activo:      img.activo
    }).subscribe({
      next: () => {
        this.guardandoId = null;
        Swal.fire({ icon: 'success', title: '¡Imagen actualizada!', timer: 1300, showConfirmButton: false });
      },
      error: () => {
        this.guardandoId = null;
        Swal.fire({ icon: 'error', title: 'Error al guardar', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
