import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { DashboardResumen, DashboardService } from './service/dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  resumen: DashboardResumen | null = null;
  cargando = false;
  ultimaActualizacion: Date | null = null;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly svc: DashboardService) {}

  ngOnInit(): void {
    this.cargar();
    // Refresco automático cada 5 minutos
    this.refreshTimer = setInterval(() => this.cargar(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getResumen().subscribe({
      next: data => {
        this.resumen = data;
        this.ultimaActualizacion = new Date();
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cargar el dashboard.',
        });
      },
    });
  }

  formatPeso(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  }

  formatHora(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
}
