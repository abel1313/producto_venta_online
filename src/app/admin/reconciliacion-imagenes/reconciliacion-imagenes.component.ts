import { Component } from '@angular/core';
import { AdminService, IResultadoReconciliacion } from '../admin.service';

@Component({
  selector: 'app-reconciliacion-imagenes',
  templateUrl: './reconciliacion-imagenes.component.html',
  styleUrls: ['./reconciliacion-imagenes.component.scss']
})
export class ReconciliacionImagenesComponent {

  productoIdFiltro: number | null = null;

  iniciando  = false;
  mensajeInicio: string | null = null;
  errorInicio: string | null   = null;

  cargandoResultado = false;
  resultado: IResultadoReconciliacion['data'] | null = null;
  errorResultado: string | null = null;

  constructor(private readonly adminService: AdminService) {}

  iniciar(): void {
    this.iniciando    = true;
    this.mensajeInicio = null;
    this.errorInicio  = null;

    const id = this.productoIdFiltro ?? undefined;
    this.adminService.iniciarReconciliacion(id).subscribe({
      next: res => {
        this.mensajeInicio = res.data;
        this.iniciando     = false;
      },
      error: () => {
        this.errorInicio = 'No se pudo iniciar la reconciliación.';
        this.iniciando   = false;
      }
    });
  }

  verResultado(): void {
    this.cargandoResultado = true;
    this.resultado         = null;
    this.errorResultado    = null;

    this.adminService.verResultadoReconciliacion().subscribe({
      next: res => {
        this.resultado         = res.data;
        this.cargandoResultado = false;
      },
      error: () => {
        this.errorResultado    = 'No se pudo obtener el resultado.';
        this.cargandoResultado = false;
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
