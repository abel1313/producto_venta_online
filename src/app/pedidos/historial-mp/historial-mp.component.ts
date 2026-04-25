import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { IHistorialMpItem, MpEstado } from '../mis-pedidos/models/IPago.model';
import { PagoService } from '../pago.service';

type Modo = 'todos' | 'pedido' | 'estado' | 'mp';

@Component({
  selector: 'app-historial-mp',
  templateUrl: './historial-mp.component.html',
  styleUrls: ['./historial-mp.component.scss']
})
export class HistorialMpComponent implements OnInit {

  cargando = false;
  items: IHistorialMpItem[] = [];
  pagina = 1;
  readonly size = 10;
  totalPaginas = 0;

  modo: Modo = 'todos';

  filtroPedidoId: number | null = null;
  filtroEstado: MpEstado | null = null;
  filtroDesde = '';
  filtroHasta = '';

  readonly modos: { key: Modo; label: string; icon: string }[] = [
    { key: 'todos',  label: 'Todos',      icon: 'pi-list'     },
    { key: 'pedido', label: 'Por pedido', icon: 'pi-tag'      },
    { key: 'estado', label: 'Por estado', icon: 'pi-filter'   },
    { key: 'mp',     label: 'Rango MP',   icon: 'pi-calendar' },
  ];

  readonly estadosOpciones: { key: MpEstado; label: string }[] = [
    { key: 'OPEN',     label: 'Pendiente' },
    { key: 'FINISHED', label: 'Pagado'    },
    { key: 'CANCELED', label: 'Cancelado' },
  ];

  constructor(
    private readonly pagoService: PagoService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdminService) {
      this.router.navigate(['/pedidos/mis-pedidos']);
      return;
    }
    this.cargar();
  }

  setModo(m: Modo): void {
    this.modo = m;
    this.pagina = 1;
    this.items = [];
    this.totalPaginas = 0;
    this.filtroPedidoId = null;
    this.filtroEstado = null;
    if (m === 'todos') this.cargar();
  }

  setEstado(e: MpEstado): void {
    this.filtroEstado = e;
    this.pagina = 1;
    this.cargar();
  }

  buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  cargar(): void {
    if (this.cargando) return;
    this.cargando = true;

    switch (this.modo) {
      case 'todos':
        this.pagoService.getHistorial(this.pagina, this.size).subscribe({
          next: res => this.setPage(res),
          error: () => { this.cargando = false; }
        });
        break;

      case 'pedido':
        if (!this.filtroPedidoId) { this.cargando = false; return; }
        this.pagoService.getHistorialPorPedido(this.filtroPedidoId, this.pagina, this.size).subscribe({
          next: res => this.setPage(res),
          error: () => { this.cargando = false; }
        });
        break;

      case 'estado':
        if (!this.filtroEstado) { this.cargando = false; return; }
        this.pagoService.getHistorialPorEstado(this.filtroEstado, this.pagina, this.size).subscribe({
          next: res => this.setPage(res),
          error: () => { this.cargando = false; }
        });
        break;

      case 'mp':
        if (!this.filtroDesde || !this.filtroHasta) { this.cargando = false; return; }
        this.pagoService.getHistorialDirectoMp(this.filtroDesde, this.filtroHasta).subscribe({
          next: items => { this.items = items ?? []; this.totalPaginas = 0; this.cargando = false; },
          error: () => { this.cargando = false; }
        });
        return;
    }
  }

  private setPage(res: { list: IHistorialMpItem[]; totalPaginas: number }): void {
    this.items = res.list ?? [];
    this.totalPaginas = res.totalPaginas ?? 0;
    this.cargando = false;
  }

  anterior(): void {
    if (this.pagina <= 1) return;
    this.pagina--;
    this.cargar();
  }

  siguiente(): void {
    if (this.pagina >= this.totalPaginas) return;
    this.pagina++;
    this.cargar();
  }

  estadoLabel(e: MpEstado): string {
    const map: Record<MpEstado, string> = { OPEN: 'Pendiente', FINISHED: 'Pagado', CANCELED: 'Cancelado' };
    return map[e] ?? e;
  }

  intentCorto(id: string): string {
    return id ? id.slice(0, 8) + '…' : '—';
  }

  get hayPaginacion(): boolean {
    return this.modo !== 'mp' && this.totalPaginas > 1;
  }
}
