import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IConfigurarRifa, TipoRifa } from '../models/configurar-rifa.model';
import { RifaService } from '../service/rifa.service';

@Component({
  selector: 'app-buscar-rifa',
  templateUrl: './buscar-rifa.component.html',
  styleUrls: ['./buscar-rifa.component.scss']
})
export class BuscarRifaComponent implements OnInit {

  tab: 'hoy' | 'todas' | 'buscar' = 'hoy';
  rifasHoy: IConfigurarRifa[]     = [];
  rifasTodas: IConfigurarRifa[]   = [];
  rifasBuscadas: IConfigurarRifa[] = [];
  cargando = false;
  buscando = false;

  // ── Filtro de búsqueda (tab "buscar") ──────────────────────────────
  filtroTipo: TipoRifa | '' = '';
  filtroMesReferencia = '';
  filtroDesde = '';
  filtroHasta = '';
  busquedaRealizada = false;

  constructor(
    private readonly rifaService: RifaService,
    private readonly router: Router
  ) {}

  ngOnInit(): void { this.cargarHoy(); }

  cambiarTab(tab: 'hoy' | 'todas' | 'buscar'): void {
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

  buscarPorFiltro(): void {
    this.cargando = true;
    this.buscando = true;
    this.busquedaRealizada = true;
    this.rifaService.buscarConfiguraciones({
      tipo: this.filtroTipo || undefined,
      mesReferencia: this.filtroMesReferencia || undefined,
      desde: this.filtroDesde || undefined,
      hasta: this.filtroHasta || undefined
    }).subscribe({
      next: res => { this.rifasBuscadas = res; this.cargando = false; this.buscando = false; },
      error: ()  => { this.cargando = false; this.buscando = false; }
    });
  }

  retomarRifa(r: IConfigurarRifa): void {
    this.router.navigate(['/rifas/agregar'], { state: { retomarRifaId: r.id } });
  }

  get rifasMostradas(): IConfigurarRifa[] {
    if (this.tab === 'hoy') return this.rifasHoy;
    if (this.tab === 'todas') return this.rifasTodas;
    return this.rifasBuscadas;
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
