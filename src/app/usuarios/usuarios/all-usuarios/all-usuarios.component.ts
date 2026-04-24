import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { IProductoPaginable } from 'src/app/productos/producto/models';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { IUsuarioDto } from '../models/usuario.dto';
import { IconService } from 'src/app/Icon/icon.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-all-usuarios',
  templateUrl: './all-usuarios.component.html',
  styleUrls: ['./all-usuarios.component.scss']
})
export class AllUsuariosComponent implements OnInit {

  buscarScrool = false;
  paginaPrimera: number = 1;
  paginaUltima: number = 0;
  totalPaginas: number = 0;
  paginacion: IProductoPaginable<IUsuarioDto[]> = {
    pagina: 0,
    t: [],
    totalPaginas: 0,
    totalRegistros: 0
  };

  rows: IUsuarioDto[] = [];
  constructor(private readonly serviceUser: UsuarioService,
    public iconImagen: IconService,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {

    // this.getDataInit(1);
  }


  onScroll(event: any): void {

    const element = event.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMore(); // Carga más datos
    }
  }
  loadMore(): void {
    this.paginaPrimera + 1;
    if (this.totalPaginas >= this.paginaPrimera) {
      this.buscarProductoSinKey(this.paginaPrimera, "");
    }
  }


  buscarProductoSinKey(paginaPrimera: number, buscarProd: string): void {
    this.serviceUser.getDataPage(paginaPrimera, 10, buscarProd)//no es
      .subscribe({
        next: (res: any) => {
          this.paginaPrimera = this.paginaPrimera + 1;
          this.paginacion = res.data;
          this.totalPaginas = this.paginacion?.totalPaginas || 0
          this.rows = [...this.rows, ...this.paginacion.t]; // Agrega sin borrar los anteriores
        },
        error: (err) => {
          console.error('Error en la petición:', err);
        }
      });
  }

  usuariosResponse(event: any) {

    this.paginaPrimera = this.paginaPrimera + 1;
    this.paginacion = event.data;
    this.totalPaginas = this.paginacion?.totalPaginas || 0
    this.rows = [...this.paginacion.t]; // Agrega sin borrar los anteriores
  }
  updateUsuario(item: any) {
    this.router.navigate(['usuarios/update']);
    this.serviceUser.userUpdate.next(item);
  }

  initials(username: string): string {
    return (username ?? '?').slice(0, 2).toUpperCase();
  }

  avatarColor(username: string): string {
    const palette = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#ec4899,#db2777)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#3b82f6,#2563eb)',
      'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      'linear-gradient(135deg,#ef4444,#dc2626)',
      'linear-gradient(135deg,#14b8a6,#0d9488)',
    ];
    const idx = (username ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  }

  removeUsuario(item: any) {
    this.serviceUser.eliminarUsuarioDto(item.id).subscribe(eliminado=>{
              Swal.fire({
                title: `Se elimino el usuario correctamente`,
                icon: "success",
                draggable: true
              });
      this.router.navigate(['usuarios/buscar']);
    },err=>{
              Swal.fire({
                title: `Ocurrio un erro al eliminar el usuario`,
                icon: "error",
                draggable: true
              });
    });
  }

}
