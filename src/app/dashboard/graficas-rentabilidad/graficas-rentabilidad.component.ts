import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CambiosDelMes, ComparativoDelMes, DashboardService, GananciaPorProducto, PeriodoDeVentas } from '../service/dashboard.service';

interface FilaComparativo {
  etiqueta: string;
  clave: keyof CambiosDelMes;
  campo: keyof PeriodoDeVentas;
  dinero: boolean;
  /** En los gastos, subir es malo; en lo demás, subir es bueno. */
  subirEsBueno: boolean;
}

/**
 * Dos paneles del Dashboard: cómo va este mes contra el mes anterior (mismos días) y qué productos dejan más ganancia.
 * Cada panel carga solo; si uno falla el otro sigue. Se vuelve a cargar cuando el Dashboard cambia `version`.
 */
@Component({
  selector: 'app-graficas-rentabilidad',
  templateUrl: './graficas-rentabilidad.component.html',
  styleUrls: ['../dashboard.component.scss'],
})
export class GraficasRentabilidadComponent implements OnChanges {
  @Input() version = 0;

  readonly filas: FilaComparativo[] = [
    { etiqueta: 'Ventas',          clave: 'ventas',       campo: 'ventas',       dinero: true,  subirEsBueno: true },
    { etiqueta: 'Número de ventas', clave: 'numeroVentas', campo: 'numeroVentas', dinero: false, subirEsBueno: true },
    { etiqueta: 'Ganancia',        clave: 'ganancia',     campo: 'ganancia',     dinero: true,  subirEsBueno: true },
    { etiqueta: 'Gastos',          clave: 'gastos',       campo: 'gastos',       dinero: true,  subirEsBueno: false },
    { etiqueta: 'Ganancia neta',   clave: 'gananciaNeta', campo: 'gananciaNeta', dinero: true,  subirEsBueno: true },
  ];

  comparativo: ComparativoDelMes | null = null;
  errorComparativo: string | null = null;

  diasProductos = 90;
  productos: GananciaPorProducto | null = null;
  errorProductos: string | null = null;

  constructor(private readonly svc: DashboardService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['version']) {
      this.cargarComparativo();
      this.cargarProductos();
    }
  }

  private cargarComparativo(): void {
    this.svc.getComparativoDelMes().subscribe({
      next: d => { this.comparativo = d; this.errorComparativo = null; },
      error: err => { this.errorComparativo = err?.error?.mensaje ?? 'No se pudo cargar el comparativo del mes.'; }
    });
  }

  cambiarDiasProductos(dias: number): void {
    this.diasProductos = dias;
    this.cargarProductos();
  }

  private cargarProductos(): void {
    this.svc.getGananciaPorProducto(this.diasProductos, 10).subscribe({
      next: d => { this.productos = d; this.errorProductos = null; },
      error: err => { this.errorProductos = err?.error?.mensaje ?? 'No se pudo cargar la ganancia por producto.'; }
    });
  }

  get hayProductos(): boolean {
    return (this.productos?.productos.length ?? 0) > 0;
  }

  valor(p: PeriodoDeVentas, f: FilaComparativo): string {
    const n = p[f.campo] as number;
    return f.dinero ? this.peso(n) : String(n);
  }

  cambio(f: FilaComparativo): number | null {
    return this.comparativo ? this.comparativo.cambio[f.clave] : null;
  }

  textoCambio(f: FilaComparativo): string {
    const c = this.cambio(f);
    if (c == null) return 'sin dato del mes anterior';
    const flecha = c > 0 ? '▲' : c < 0 ? '▼' : '=';
    return `${flecha} ${Math.abs(c).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;
  }

  /** Verde si cambió para bien, rojo si cambió para mal, neutro si igual o sin dato. */
  claseCambio(f: FilaComparativo): string {
    const c = this.cambio(f);
    if (c == null || c === 0) return 'rent-cambio--neutro';
    return (c > 0) === f.subirEsBueno ? 'rent-cambio--bien' : 'rent-cambio--mal';
  }

  /** Ancho de la barra de un producto, contra el que más ganancia dejó. */
  anchoBarra(ganancia: number): number {
    const mayor = this.productos?.productos[0]?.ganancia ?? 0;
    return mayor > 0 ? Math.max(2, Math.round((ganancia / mayor) * 100)) : 0;
  }

  peso(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }
}
