import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IPromocion, IPromocionDetalle, IPromocionRequest } from 'src/app/promociones/models/promocion.model';
import { PromocionService } from 'src/app/promociones/service/promocion.service';
import { VarianteService } from 'src/app/variante/service/variante.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';

interface IDetalleForm extends IPromocionDetalle {
  precioNormalStr?: string; // solo para mostrar
}

@Component({
  selector: 'app-gestion-promociones',
  templateUrl: './gestion-promociones.component.html',
  styleUrls: ['./gestion-promociones.component.scss']
})
export class GestionPromocionesComponent implements OnInit, OnDestroy {

  // ── Lista ─────────────────────────────────────────────────────────────
  promos: IPromocion[] = [];
  cargando = false;
  pagina = 1;
  size = 10;
  totalPaginas = 1;

  // ── Formulario ────────────────────────────────────────────────────────
  modoForm: 'nuevo' | 'editar' | null = null;
  editandoId: number | null = null;
  guardando = false;

  formDescripcion = '';
  formFechaVencimiento = '';
  formDetalles: IDetalleForm[] = [];

  // ── Búsqueda de variante para agregar al form ─────────────────────────
  terminoVariante = '';
  resultadosVariante: IVarianteResumen[] = [];
  buscandoVariante = false;
  private varInput$ = new Subject<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private readonly promoService: PromocionService,
    private readonly varianteService: VarianteService
  ) {}

  ngOnInit(): void {
    this.cargar();

    this.varInput$.pipe(
      filter(t => t.trim().length >= 2),
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(termino => this.buscarVariante(termino));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Lista ─────────────────────────────────────────────────────────────

  cargar(): void {
    this.cargando = true;
    this.promoService.getAdmin(this.pagina, this.size).subscribe({
      next: res => {
        this.promos = res?.data?.t ?? [];
        this.totalPaginas = res?.data?.totalPaginas ?? 1;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'Error al cargar promociones', text: err?.error?.mensaje ?? 'Error desconocido.' });
      }
    });
  }

  paginaAnterior(): void {
    if (this.pagina > 1) { this.pagina--; this.cargar(); }
  }

  paginaSiguiente(): void {
    if (this.pagina < this.totalPaginas) { this.pagina++; this.cargar(); }
  }

  badgeEstado(p: IPromocion): string {
    if (!p.activo) return '⚫ Inactiva';
    if (new Date(p.fechaVencimiento) < new Date()) return '🔴 Vencida';
    return '🟢 Activa';
  }

  claseBadge(p: IPromocion): string {
    if (!p.activo) return 'gp-badge--off';
    if (new Date(p.fechaVencimiento) < new Date()) return 'gp-badge--vencida';
    return 'gp-badge--activa';
  }

  precioTotalNormal(p: IPromocion): number {
    return p.detalles.reduce((s, d) => s + (d.precioNormal ?? 0) * d.cantidad, 0);
  }

  precioTotalPromo(p: IPromocion): number {
    return p.detalles.reduce((s, d) => s + d.precioEnPromocion * d.cantidad, 0);
  }

  toggleActivo(p: IPromocion): void {
    const nuevoValor = !p.activo;
    const label = nuevoValor ? 'activar' : 'desactivar';
    Swal.fire({
      title: `¿${nuevoValor ? 'Activar' : 'Desactivar'} promoción?`,
      text: p.descripcion,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${label}`,
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.promoService.toggleActivo(p.id, nuevoValor).subscribe({
        next: () => { p.activo = nuevoValor; },
        error: err => Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudo cambiar el estado.' })
      });
    });
  }

  // ── Formulario ────────────────────────────────────────────────────────

  abrirNuevo(): void {
    this.modoForm = 'nuevo';
    this.editandoId = null;
    this.resetForm();
  }

  abrirEditar(p: IPromocion): void {
    this.modoForm = 'editar';
    this.editandoId = p.id;
    this.formDescripcion = p.descripcion;
    this.formFechaVencimiento = p.fechaVencimiento.slice(0, 16); // datetime-local
    this.formDetalles = p.detalles.map(d => ({ ...d }));
  }

  cancelarForm(): void {
    this.modoForm = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.formDescripcion = '';
    this.formFechaVencimiento = '';
    this.formDetalles = [];
    this.terminoVariante = '';
    this.resultadosVariante = [];
  }

  guardar(): void {
    if (!this.formDescripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta descripción', text: 'Escribe una descripción para la promoción.' });
      return;
    }
    if (!this.formFechaVencimiento) {
      Swal.fire({ icon: 'warning', title: 'Falta fecha', text: 'Indica la fecha y hora de vencimiento.' });
      return;
    }
    if (this.formDetalles.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin piezas', text: 'Agrega al menos una variante al combo.' });
      return;
    }
    if (this.formDetalles.some(d => !d.precioEnPromocion || d.precioEnPromocion <= 0)) {
      Swal.fire({ icon: 'warning', title: 'Precio inválido', text: 'Todos los precios de promoción deben ser mayores a 0.' });
      return;
    }

    this.guardando = true;
    const req: IPromocionRequest = {
      descripcion:       this.formDescripcion.trim(),
      fechaVencimiento:  this.formFechaVencimiento + ':00',
      detalles: this.formDetalles.map(d => ({
        varianteId:         d.varianteId,
        cantidad:           d.cantidad,
        precioEnPromocion:  d.precioEnPromocion
      }))
    };

    const obs = this.modoForm === 'editar' && this.editandoId
      ? this.promoService.editar(this.editandoId, req)
      : this.promoService.crear(req);

    obs.subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: this.modoForm === 'editar' ? 'Promoción actualizada' : 'Promoción creada', timer: 1500, showConfirmButton: false });
        this.cancelarForm();
        this.cargar();
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', text: err?.error?.mensaje ?? 'No se pudo guardar la promoción.' });
      }
    });
  }

  // ── Búsqueda de variante para el form ─────────────────────────────────

  onInputVariante(): void {
    this.varInput$.next(this.terminoVariante);
    if (this.terminoVariante.trim().length < 2) this.resultadosVariante = [];
  }

  private buscarVariante(termino: string): void {
    this.buscandoVariante = true;
    this.varianteService.buscar({ termino, pagina: 1, size: 8 }).subscribe({
      next: res => {
        this.resultadosVariante = res?.t ?? [];
        this.buscandoVariante = false;
      },
      error: () => { this.buscandoVariante = false; }
    });
  }

  seleccionarVariante(v: IVarianteResumen): void {
    if (this.formDetalles.some(d => d.varianteId === v.id)) {
      Swal.fire({ icon: 'info', title: 'Ya agregada', text: 'Esta variante ya está en el combo.', timer: 1500, showConfirmButton: false });
    } else {
      this.formDetalles.push({
        varianteId:       v.id,
        nombreProducto:   v.nombreProducto ?? undefined,
        talla:            v.talla ?? undefined,
        color:            v.color ?? undefined,
        marca:            v.marca ?? undefined,
        cantidad:         1,
        precioNormal:     v.precio ?? 0,
        precioEnPromocion: 0,
        imagenUrl:        v.imagenUrl ?? undefined,
        precioNormalStr:  v.precio ? `$${v.precio}` : ''
      });
    }
    this.terminoVariante = '';
    this.resultadosVariante = [];
  }

  quitarDetalle(idx: number): void {
    this.formDetalles.splice(idx, 1);
  }

  labelVariante(v: IVarianteResumen): string {
    return [v.nombreProducto, v.talla, v.color, v.marca].filter(Boolean).join(' · ') || `Variante #${v.id}`;
  }

  labelDetalle(d: IDetalleForm): string {
    return [d.nombreProducto, d.talla, d.color, d.marca].filter(Boolean).join(' · ') || `Variante #${d.varianteId}`;
  }
}
