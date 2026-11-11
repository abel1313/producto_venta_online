import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, of, timer } from 'rxjs';
import { catchError, debounceTime, map, switchMap, takeUntil, takeWhile } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { ProductoService } from '../../productos/service/producto.service';
import {
  FiltroReporteCategoria, PaginaReporteCategoria, ReporteGenerado, ReportesService, TipoReporteCategoria, VistaReporteCategoria
} from '../service/reportes.service';

/** Un producto que el administrador puede elegir para el reporte. */
export interface ProductoElegible { id: number; nombre: string; codigoBarras: string | null; categoria: string | null; }

/**
 * Reporte por categoría / por productos elegidos (solo administrador, hecho en duro; pendiente pasarlo a una acción del menú).
 * Modo «Por categoría»: fechas + categoría (una, «Otros» = sin categoría, o todas). Modo «Productos elegidos»: fechas + los productos que se marquen
 * (si un producto se vendió varias veces, sus piezas se suman). Se ve en pantalla (paginado) y se baja en Excel o PDF: el archivo se arma en segundo
 * plano en el back y aquí se espera con un aviso. Solo tokens del diseño (día y noche).
 */
@Component({
  selector: 'app-reporte-categoria',
  templateUrl: './reporte-categoria.component.html',
  styleUrls: ['./reporte-categoria.component.scss']
})
export class ReporteCategoriaComponent implements OnInit, OnDestroy {

  /** Valor del selector de categoría para «Otros» (productos sin ninguna categoría). */
  readonly OTROS = '__OTROS__';
  readonly opcionesPorPagina = [10, 20, 50];
  private static readonly MAX_ELEGIDOS = 500;
  private static readonly MAX_CONSULTAS_ESTADO = 100;   // ~5 min a 3 s

  modo: 'categoria' | 'productos' = 'categoria';
  desde = '';
  hasta = '';
  categorias: string[] = [];
  categoria = '';
  vista: VistaReporteCategoria = 'TODOS';
  tipoReporte: TipoReporteCategoria = 'COMPLETO';
  /** El tipo con el que se armó lo que se ve en pantalla (no cambia hasta volver a consultar). */
  tipoMostrado: TipoReporteCategoria = 'COMPLETO';

  // Productos elegidos
  busqueda = '';
  resultadosBusqueda: ProductoElegible[] = [];
  buscando = false;
  elegidos: ProductoElegible[] = [];

  // Reporte en pantalla
  resultado: PaginaReporteCategoria | null = null;
  pagina = 1;
  porPagina = 20;
  cargando = false;
  error: string | null = null;

  // Excel / PDF
  generando: ReporteGenerado | null = null;
  avisoArchivo: string | null = null;
  errorArchivo: string | null = null;
  generados: ReporteGenerado[] = [];

  private readonly buscador$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private seguimiento$ = new Subject<void>();

  constructor(public readonly authService: AuthService, private readonly svc: ReportesService, private readonly productos: ProductoService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.hasta = this.dia(hoy);
    this.desde = this.dia(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    if (!this.authService.isAdminService) return;
    this.productos.categoriasAdmin().pipe(catchError(() => of([] as string[])), takeUntil(this.destroy$)).subscribe(cs => this.categorias = cs);
    this.buscador$.pipe(
      debounceTime(350),
      switchMap(t => {
        const texto = t.trim();
        if (texto.length < 2) return of({ texto, r: null as ProductoElegible[] | null });
        this.buscando = true;
        return this.productos.adminFiltrar({ nombreOCodigo: texto }, 1, 8).pipe(
          map(r => ({ texto, r: (r?.t ?? []).map(p => ({ id: p.idProducto, nombre: p.nombre, codigoBarras: p.codigoBarras ?? null, categoria: p.palabraClave?.nombre ?? null })) })),
          catchError(() => of({ texto, r: [] as ProductoElegible[] })));   // 404 = sin coincidencias
      }),
      takeUntil(this.destroy$)
    ).subscribe(({ r }) => { this.buscando = false; this.resultadosBusqueda = r ?? []; });
    this.cargarGenerados();
  }

  ngOnDestroy(): void {
    this.seguimiento$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private dia(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  }

  // ── Filtros ──
  get fechasAlReves(): boolean { return !!this.desde && !!this.hasta && this.desde > this.hasta; }
  get puedeConsultar(): boolean {
    return !!this.desde && !!this.hasta && !this.fechasAlReves && (this.modo === 'categoria' || this.elegidos.length > 0);
  }

  private get filtro(): FiltroReporteCategoria {
    const base = { desde: this.desde, hasta: this.hasta, vista: this.vista, tipoReporte: this.tipoReporte };
    if (this.modo === 'productos') return { ...base, productoIds: this.elegidos.map(e => e.id) };
    if (this.categoria === this.OTROS) return { ...base, sinCategoria: true };
    return { ...base, categoria: this.categoria || undefined };
  }

  cambiarModo(m: 'categoria' | 'productos'): void {
    if (this.modo === m) return;
    this.modo = m;
    this.resultado = null;
    this.error = null;
  }

  // ── Productos elegidos ──
  alEscribir(t: string): void { this.buscador$.next(t); }
  estaElegido(p: ProductoElegible): boolean { return this.elegidos.some(e => e.id === p.id); }
  elegir(p: ProductoElegible): void {
    if (this.estaElegido(p)) return;
    if (this.elegidos.length >= ReporteCategoriaComponent.MAX_ELEGIDOS) { this.error = `Elige máximo ${ReporteCategoriaComponent.MAX_ELEGIDOS} productos.`; return; }
    this.elegidos = [...this.elegidos, p];
    this.resultado = null;
  }
  quitar(p: ProductoElegible): void { this.elegidos = this.elegidos.filter(e => e.id !== p.id); this.resultado = null; }
  quitarTodos(): void { this.elegidos = []; this.resultado = null; }

  // ── Reporte en pantalla ──
  consultar(pagina = 1): void {
    if (!this.puedeConsultar) return;
    this.cargando = true;
    this.error = null;
    this.svc.getPorCategoria(this.filtro, pagina, this.porPagina).subscribe({
      next: r => { this.resultado = r; this.tipoMostrado = this.tipoReporte; this.pagina = r.pagina; this.cargando = false; },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.resultado = null;
        this.error = e.status === 400 && e.error?.mensaje ? e.error.mensaje : 'No se pudo armar el reporte. Intenta de nuevo.';
      }
    });
  }

  irAPagina(p: number): void {
    if (!this.resultado || p < 1 || p > this.resultado.totalPaginas) return;
    this.consultar(p);
  }

  cambiarPorPagina(): void { this.consultar(1); }

  // ── Excel / PDF en segundo plano ──
  get armandoArchivo(): boolean { return !!this.generando && (this.generando.estado === 'PENDIENTE' || this.generando.estado === 'GENERANDO'); }

  pedirArchivo(formato: 'XLSX' | 'PDF'): void {
    if (!this.puedeConsultar || this.armandoArchivo) return;
    this.errorArchivo = null;
    this.avisoArchivo = null;
    this.svc.generarReporteCategoria(this.filtro, formato).subscribe({
      next: r => { this.generando = r; this.avisoArchivo = `Armando tu ${formato === 'PDF' ? 'PDF' : 'Excel'}… puedes seguir usando la pantalla; se descargará solo cuando esté listo.`; this.seguir(r.id); },
      error: (e: HttpErrorResponse) => {
        this.errorArchivo = e.error?.mensaje ?? (e.status === 429 ? 'Hay muchos reportes armándose. Espera un momento.' : 'No se pudo pedir el reporte.');
      }
    });
  }

  /** Pregunta cada 3 s por el estado del reporte; cuando está LISTO lo descarga solo. */
  private seguir(id: number): void {
    this.seguimiento$.next();
    let consultas = 0;
    timer(3000, 3000).pipe(
      switchMap(() => this.svc.getEstadoReporteGenerado(id).pipe(catchError(() => of(null)))),
      takeWhile(e => { consultas++; return !!e && (e.estado === 'PENDIENTE' || e.estado === 'GENERANDO') && consultas < ReporteCategoriaComponent.MAX_CONSULTAS_ESTADO; }, true),
      takeUntil(this.seguimiento$), takeUntil(this.destroy$)
    ).subscribe(e => {
      if (!e) return;
      this.generando = e;
      if (e.estado === 'LISTO') { this.avisoArchivo = '✔ Tu reporte está listo.'; this.descargar(e); this.cargarGenerados(); }
      else if (e.estado === 'ERROR') { this.avisoArchivo = null; this.errorArchivo = e.error ?? 'No se pudo armar el reporte.'; this.cargarGenerados(); }
      else if (consultas >= ReporteCategoriaComponent.MAX_CONSULTAS_ESTADO) { this.avisoArchivo = 'Sigue armándose. Cuando termine lo encuentras abajo, en «Mis reportes».'; this.cargarGenerados(); }
    });
  }

  cargarGenerados(): void {
    this.svc.getReportesGenerados().pipe(catchError(() => of([] as ReporteGenerado[]))).subscribe(l => this.generados = l.slice(0, 10));
  }

  descargar(r: ReporteGenerado): void {
    this.svc.descargarReporteGenerado(r.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.nombreArchivo ?? `reporte.${r.formato === 'PDF' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => { this.errorArchivo = 'No se pudo descargar el archivo. Búscalo en «Mis reportes».'; }
    });
  }

  etiquetaEstado(e: ReporteGenerado['estado']): string {
    return { PENDIENTE: 'En espera', GENERANDO: 'Armándose…', LISTO: 'Listo', ERROR: 'Con error' }[e];
  }

  tam(bytes: number): string { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

  porId(_: number, x: { productoId?: number; id?: number }): number | undefined { return x.productoId ?? x.id; }
}
