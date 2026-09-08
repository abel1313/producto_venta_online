import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { IConfigurarRifa, TipoRifa } from '../models/configurar-rifa.model';
import { IEstadoRifa } from '../models/estado-rifa.model';
import { RifaService } from '../service/rifa.service';

@Component({
  selector: 'app-buscar-rifa',
  templateUrl: './buscar-rifa.component.html',
  styleUrls: ['./buscar-rifa.component.scss']
})
export class BuscarRifaComponent implements OnInit {

  tipo: TipoRifa = 'DIARIA';

  diaFiltro  = '';
  mesFiltro  = '';

  rifas: IConfigurarRifa[]  = [];
  cargando                  = false;
  busquedaRealizada         = false;

  rifaDetalle: IEstadoRifa | null = null;
  cargandoDetalle                 = false;

  recuperando: number | null = null;

  constructor(
    private readonly rifaService: RifaService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const hoy  = new Date();
    this.diaFiltro = hoy.toISOString().slice(0, 10);
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
    this.mesFiltro = `${anio}-${mes}`;
    this.buscar();
  }

  cambiarTipo(tipo: TipoRifa): void {
    this.tipo  = tipo;
    this.rifas = [];
    this.rifaDetalle       = null;
    this.busquedaRealizada = false;
    this.buscar();
  }

  buscar(): void {
    this.cargando          = true;
    this.busquedaRealizada = true;
    this.rifaDetalle       = null;
    const params: { tipo: TipoRifa; desde?: string; hasta?: string; mesReferencia?: string } = { tipo: this.tipo };
    if (this.tipo === 'DIARIA') {
      params.desde = this.diaFiltro;
      params.hasta = this.diaFiltro;
    } else {
      params.mesReferencia = this.mesFiltro;
    }
    this.rifaService.buscarConfiguraciones(params).subscribe({
      next: res => { this.rifas = res; this.cargando = false; },
      error: ()  => { this.cargando = false; }
    });
  }

  badgeEstado(r: IConfigurarRifa): { label: string; css: string } {
    if (r.activa) return { label: '🟢 Activa', css: 'br-badge--activa' };
    if (r.totalVariantes && (r.variantesSorteadas ?? 0) >= r.totalVariantes) {
      return { label: '⚫ Completada', css: 'br-badge--completada' };
    }
    return { label: '🔴 Vencida', css: 'br-badge--vencida' };
  }

  irAEjecucion(r: IConfigurarRifa): void {
    const ruta = r.tipo === 'MENSUAL' ? '/rifas/mes' : '/rifas/agregar';
    this.router.navigate([ruta], { state: { retomarRifaId: r.id } });
  }

  verDetalle(r: IConfigurarRifa): void {
    if (this.rifaDetalle?.configurarRifa?.id === r.id) {
      this.rifaDetalle = null;
      return;
    }
    this.rifaDetalle    = null;
    this.cargandoDetalle = true;
    this.rifaService.getEstado(r.id!).subscribe({
      next: res => { this.rifaDetalle = res; this.cargandoDetalle = false; },
      error: ()  => { this.cargandoDetalle = false; }
    });
  }

  cerrarDetalle(): void { this.rifaDetalle = null; }

  recuperarRifa(r: IConfigurarRifa): void {
    if (!r.id || this.recuperando) return;
    this.recuperando = r.id;
    this.rifaService.reiniciar(r.id, false).subscribe({
      next: () => {
        this.recuperando = null;
        this.buscar();
      },
      error: err => {
        this.recuperando = null;
        Swal.fire({
          icon: 'error',
          title: 'Error al recuperar',
          text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo recuperar la rifa.'
        });
      }
    });
  }

  progreso(r: IConfigurarRifa): string {
    if (!r.totalVariantes) return '—';
    return `${r.variantesSorteadas ?? 0}/${r.totalVariantes}`;
  }

  pct(r: IConfigurarRifa): number {
    if (!r.totalVariantes) return 0;
    return Math.round(((r.variantesSorteadas ?? 0) / r.totalVariantes) * 100);
  }

  nombreCompleto(c?: { nombre?: string | null; apellidoPaterno?: string | null } | null): string {
    if (!c) return '';
    return [c.nombre, c.apellidoPaterno].filter(p => !!p).join(' ');
  }
}
