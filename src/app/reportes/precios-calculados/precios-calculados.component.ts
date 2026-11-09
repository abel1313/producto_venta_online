import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { CalculoPrecioService, ICalculoDeProducto, ICalculoGuardado, IFiltroCalculos, IPaginaCalculos } from '../../shared/calculadora-precio/calculo-precio.service';

/**
 * Precios calculados (solo administrador): el último cálculo de precio de cada producto — lo que calculó la calculadora, lo que de verdad se cobra,
 * la ganancia real y si el precio de hoy ya no coincide. Cada producto abre su historial de cálculos. Solo tokens del diseño (día y noche).
 */
@Component({
  selector: 'app-precios-calculados',
  templateUrl: './precios-calculados.component.html',
  styleUrls: ['./precios-calculados.component.scss']
})
export class PreciosCalculadosComponent implements OnInit {

  filtros: IFiltroCalculos = { nombre: '', desde: null, hasta: null };
  readonly opcionesPorPagina = [10, 20, 50];
  porPagina = 20;
  pagina = 1;
  resultado: IPaginaCalculos | null = null;
  cargando = false;
  error: string | null = null;

  /** Productos con su historial abierto, y lo ya leído de cada uno. */
  private readonly abiertos = new Set<number>();
  private readonly historiales = new Map<number, ICalculoGuardado[] | 'cargando'>();

  constructor(public readonly authService: AuthService, private readonly svc: CalculoPrecioService) {}

  ngOnInit(): void {
    if (this.authService.isAdminService) this.buscar(1);
  }

  get fechasAlReves(): boolean {
    return !!this.filtros.desde && !!this.filtros.hasta && this.filtros.desde > this.filtros.hasta;
  }

  buscar(pagina = 1): void {
    if (this.fechasAlReves) return;
    this.cargando = true;
    this.error = null;
    this.svc.listar(this.filtros, pagina, this.porPagina).subscribe({
      next: r => { this.resultado = r; this.pagina = r.pagina; this.cargando = false; },
      error: () => { this.cargando = false; this.error = 'No se pudieron leer los cálculos. Revisa que la migración de cálculos de precio esté corrida en este ambiente.'; }
    });
  }

  limpiar(): void {
    this.filtros = { nombre: '', desde: null, hasta: null };
    this.buscar(1);
  }

  irAPagina(p: number): void {
    if (!this.resultado || p < 1 || p > this.resultado.totalPaginas) return;
    this.buscar(p);
  }

  estaAbierto(productoId: number): boolean { return this.abiertos.has(productoId); }

  historialDe(productoId: number): ICalculoGuardado[] | 'cargando' | undefined { return this.historiales.get(productoId); }

  alternarHistorial(f: ICalculoDeProducto): void {
    const id = f.calculo.productoId;
    if (this.abiertos.has(id)) { this.abiertos.delete(id); return; }
    this.abiertos.add(id);
    if (!this.historiales.has(id)) {
      this.historiales.set(id, 'cargando');
      this.svc.historial(id, 10).subscribe(h => this.historiales.set(id, h));
    }
  }

  porIdDeCalculo(_: number, f: ICalculoDeProducto): number { return f.calculo.id; }
  porIdDeHistorial(_: number, c: ICalculoGuardado): number { return c.id; }
}
