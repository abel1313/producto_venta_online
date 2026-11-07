import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ProductoService } from '../productos/service/producto.service';
import { IGrupoPrecioCantidad, IGrupoProducto, PrecioCantidadService } from './precio-cantidad.service';

interface IProductoCatalogo { id: number; nombre: string; precioVenta: number; stock: number; categoria: string | null; }

/**
 * Grupos de precio por cantidad (solo administrador): "si llevas N piezas de este grupo, cada una sale a su precio de promoción".
 * Reglas G1 a G8 de `PLAN_CAMPANAS_Y_PRECIOS.md` (back). Un producto está en UN solo grupo (el back lo rechaza y dice en cuál).
 * Todo el color sale de los tokens del diseño (Personalización), de día y de noche.
 */
@Component({
  selector: 'app-grupos-precio',
  templateUrl: './grupos-precio.component.html',
  styleUrls: ['./grupos-precio.component.scss']
})
export class GruposPrecioComponent implements OnInit, OnDestroy {

  grupos: IGrupoPrecioCantidad[] = [];
  cargando = false;
  error: string | null = null;

  /** El grupo que se está creando o editando; null = solo la lista. */
  edicion: IGrupoPrecioCantidad | null = null;
  guardando = false;

  // Catálogo de productos para agregarlos al grupo: se muestra la lista (no hay que recordar nombres); el texto solo filtra.
  readonly porPagina = 12;
  catalogo: IProductoCatalogo[] = [];
  pagina = 1;
  totalPaginas = 1;
  totalRegistros = 0;
  filtro = '';
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;
  private readonly buscador$ = new Subject<string>();
  private sub?: Subscription;

  constructor(private readonly svc: PrecioCantidadService, private readonly productos: ProductoService) {}

  ngOnInit(): void {
    this.cargar();
    this.sub = this.buscador$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.cargarCatalogo(1));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.listar().subscribe({
      next: g => { this.grupos = g; this.cargando = false; },
      error: e => { this.error = this.mensaje(e, 'No se pudieron cargar los grupos.'); this.cargando = false; }
    });
  }

  // ── Lista ──────────────────────────────────────────────────────────────────

  estado(g: IGrupoPrecioCantidad): string {
    if (!g.activo) return 'Apagado';
    return g.vigente ? 'Vigente' : 'Fuera de fechas';
  }

  claseEstado(g: IGrupoPrecioCantidad): string {
    return !g.activo ? 'gp-estado--apagado' : g.vigente ? 'gp-estado--ok' : 'gp-estado--fuera';
  }

  fechas(g: IGrupoPrecioCantidad): string {
    if (!g.fechaInicio && !g.fechaFin) return 'Sin fechas (siempre que esté activo)';
    return `${g.fechaInicio || 'desde siempre'} → ${g.fechaFin || 'sin fin'}`;
  }

  alternar(g: IGrupoPrecioCantidad): void {
    this.svc.cambiarActivo(g.id!, !g.activo).subscribe({
      next: () => this.cargar(),
      error: e => Swal.fire({ icon: 'error', title: 'No se pudo cambiar', text: this.mensaje(e, 'Intenta de nuevo.') })
    });
  }

  async eliminar(g: IGrupoPrecioCantidad): Promise<void> {
    const r = await Swal.fire({
      icon: 'warning', title: `¿Eliminar «${g.nombre}»?`,
      text: 'Sus productos vuelven a cobrarse a su precio normal. No se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No'
    });
    if (!r.isConfirmed) return;
    this.svc.eliminar(g.id!).subscribe({
      next: () => this.cargar(),
      error: e => Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: this.mensaje(e, 'Intenta de nuevo.') })
    });
  }

  // ── Formulario ─────────────────────────────────────────────────────────────

  nuevo(): void {
    this.edicion = { nombre: '', minimoPiezas: 3, fechaInicio: null, fechaFin: null, activo: true, productos: [] };
    this.abrirCatalogo();
  }

  editar(g: IGrupoPrecioCantidad): void {
    this.edicion = { ...g, productos: g.productos.map(p => ({ ...p })) };
    this.abrirCatalogo();
  }

  cancelar(): void { this.edicion = null; }

  get puedeGuardar(): boolean {
    const g = this.edicion;
    return !!g && g.nombre.trim().length > 0 && g.minimoPiezas >= 2 && g.productos.length > 0
      && g.productos.every(p => p.precioPromocion > 0)
      && !(g.fechaInicio && g.fechaFin && g.fechaInicio > g.fechaFin);
  }

  guardar(): void {
    const g = this.edicion;
    if (!g || !this.puedeGuardar) return;
    this.guardando = true;
    const cuerpo: IGrupoPrecioCantidad = {
      ...g, nombre: g.nombre.trim(),
      fechaInicio: g.fechaInicio || null, fechaFin: g.fechaFin || null,
      productos: g.productos.map(p => ({ productoId: p.productoId, nombre: null, precioPromocion: +p.precioPromocion }))
    };
    const peticion = g.id ? this.svc.actualizar(g.id, cuerpo) : this.svc.crear(cuerpo);
    peticion.subscribe({
      next: () => { this.guardando = false; this.edicion = null; this.cargar(); },
      error: e => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: this.mensaje(e, 'Revisa los datos e intenta de nuevo.') });
      }
    });
  }

  // ── Productos del grupo ────────────────────────────────────────────────────

  private abrirCatalogo(): void {
    this.filtro = '';
    this.cargarCatalogo(1);
  }

  alEscribir(texto: string): void {
    this.filtro = texto;
    this.buscador$.next(texto.trim());
  }

  cargarCatalogo(pagina: number): void {
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    // `todos`: el administrador ve también los productos sin stock o deshabilitados (un juguete puede estar agotado hoy y entrar al grupo).
    this.productos.getDataNombreCodigoBarra(pagina, this.porPagina, this.filtro.trim(), true).subscribe({
      next: r => {
        this.catalogo = (r?.t ?? []).map(p => ({
          id: p.idProducto, nombre: p.nombre, precioVenta: p.precioVenta, stock: p.stock, categoria: p.palabraClave?.nombre ?? null
        }));
        this.pagina = r?.pagina ?? pagina;
        this.totalPaginas = Math.max(1, r?.totalPaginas ?? 1);
        this.totalRegistros = r?.totalRegistros ?? this.catalogo.length;
        this.cargandoCatalogo = false;
      },
      error: (e: HttpErrorResponse) => {
        this.catalogo = [];
        this.totalPaginas = 1;
        this.totalRegistros = 0;
        // El back responde 404 cuando el filtro no encuentra nada: no es un error para el usuario.
        this.errorCatalogo = e.status === 404 ? null : 'No se pudo cargar el catálogo.';
        this.cargandoCatalogo = false;
      }
    });
  }

  irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas && p !== this.pagina) this.cargarCatalogo(p);
  }

  /** ¿Dónde está este producto? 'aqui' = ya en este grupo; 'otro' = en otro grupo (no se puede repetir); 'libre'. */
  estadoDe(p: IProductoCatalogo): { tipo: 'aqui' | 'otro' | 'libre'; grupo?: string } {
    if (this.edicion?.productos.some(x => x.productoId === p.id)) return { tipo: 'aqui' };
    const otro = this.grupos.find(g => g.id !== this.edicion?.id && g.productos.some(x => x.productoId === p.id));
    return otro ? { tipo: 'otro', grupo: otro.nombre } : { tipo: 'libre' };
  }

  agregarProducto(p: IProductoCatalogo): void {
    const g = this.edicion;
    if (!g || g.productos.some(x => x.productoId === p.id)) return;
    g.productos = [...g.productos, { productoId: p.id, nombre: p.nombre, precioPromocion: p.precioVenta }];
  }

  porIdDeCatalogo(_: number, p: IProductoCatalogo): number { return p.id; }

  quitarProducto(p: IGrupoProducto): void {
    if (this.edicion) this.edicion.productos = this.edicion.productos.filter(x => x.productoId !== p.productoId);
  }

  porIdDeProducto(_: number, p: IGrupoProducto): number { return p.productoId; }

  private mensaje(e: unknown, defecto: string): string {
    return (e instanceof HttpErrorResponse ? e.error?.mensaje : null) || defecto;
  }
}
