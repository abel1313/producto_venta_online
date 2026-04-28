import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { AdminService } from '../admin.service';

@Component({
  selector: 'app-cache',
  templateUrl: './cache.component.html',
  styleUrls: ['./cache.component.scss']
})
export class CacheComponent {
  limpiando = false;
  cachesLimpiadas: string[] = [];

  constructor(private readonly adminService: AdminService) {}

  limpiarCache(): void {
    Swal.fire({
      title: '¿Limpiar toda la caché?',
      text: 'Las próximas solicitudes serán más lentas mientras se reconstruye.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      background: '#1e1b4b',
      color: '#fff'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.limpiando = true;
      this.cachesLimpiadas = [];

      this.adminService.limpiarCache().subscribe({
        next: caches => {
          this.cachesLimpiadas = caches ?? [];
          this.limpiando = false;
          Swal.fire({
            icon: 'success',
            title: `¡${this.cachesLimpiadas.length} cachés limpiadas!`,
            timer: 1800,
            showConfirmButton: false,
            background: '#1e1b4b',
            color: '#fff'
          });
        },
        error: () => {
          this.limpiando = false;
          Swal.fire({
            icon: 'error',
            title: 'Error al limpiar la caché',
            timer: 2000,
            showConfirmButton: false,
            background: '#1e1b4b',
            color: '#fff'
          });
        }
      });
    });
  }
}
