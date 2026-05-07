import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IConfigurarRifa } from '../models/configurar-rifa.model';
import { RifaService } from '../service/rifa.service';

@Component({
  selector: 'app-buscar-rifa',
  templateUrl: './buscar-rifa.component.html',
  styleUrls: ['./buscar-rifa.component.scss']
})
export class BuscarRifaComponent implements OnInit {

  tab: 'hoy' | 'todas' = 'hoy';
  rifasHoy: IConfigurarRifa[]   = [];
  rifasTodas: IConfigurarRifa[] = [];
  cargando = false;

  constructor(
    private readonly rifaService: RifaService,
    private readonly router: Router
  ) {}

  ngOnInit(): void { this.cargarHoy(); }

  cambiarTab(tab: 'hoy' | 'todas'): void {
    this.tab = tab;
    if (tab === 'hoy'   && this.rifasHoy.length   === 0) this.cargarHoy();
    if (tab === 'todas' && this.rifasTodas.length  === 0) this.cargarTodas();
  }

  cargarHoy(): void {
    this.cargando = true;
    this.rifaService.getConfiguracionesHoy().subscribe({
      next: res => { this.rifasHoy = res; this.cargando = false; },
      error: ()  => { this.cargando = false; }
    });
  }

  cargarTodas(): void {
    this.cargando = true;
    this.rifaService.getConfiguracionesActivas().subscribe({
      next: res => { this.rifasTodas = res; this.cargando = false; },
      error: ()  => { this.cargando = false; }
    });
  }

  retomarRifa(r: IConfigurarRifa): void {
    this.router.navigate(['/rifas/agregar'], { state: { retomarRifaId: r.id } });
  }

  get rifasMostradas(): IConfigurarRifa[] {
    return this.tab === 'hoy' ? this.rifasHoy : this.rifasTodas;
  }

  progreso(r: IConfigurarRifa): string {
    if (!r.totalVariantes) return '';
    return `${r.variantesSorteadas ?? 0}/${r.totalVariantes} variantes`;
  }

  pct(r: IConfigurarRifa): number {
    if (!r.totalVariantes) return 0;
    return Math.round(((r.variantesSorteadas ?? 0) / r.totalVariantes) * 100);
  }
}
