import { Component, OnDestroy, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { IItemPromoCarrito, IPromocion } from './models/promocion.model';
import { PromocionService } from './service/promocion.service';
import { CarritoVarianteService } from '../variante/service/carrito-variante.service';

@Component({
  selector: 'app-promociones',
  templateUrl: './promociones.component.html',
  styleUrls: ['./promociones.component.scss']
})
export class PromocionesComponent implements OnInit, OnDestroy {

  promos: IPromocion[] = [];
  cargando = false;
  pagina = 1;
  size = 12;
  totalPaginas = 1;

  // Detalle abierto
  promoDetalle: IPromocion | null = null;
  cantidadDetalle = 1;

  // Countdown timers
  private timers: ReturnType<typeof setInterval>[] = [];
  countdowns: Map<number, string> = new Map();

  constructor(
    private readonly promoService: PromocionService,
    private readonly carritoService: CarritoVarianteService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.timers.forEach(t => clearInterval(t));
  }

  // ── Lista ─────────────────────────────────────────────────────────────

  cargar(): void {
    this.cargando = true;
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
    this.countdowns = new Map();

    this.promoService.getActivas(this.pagina, this.size).subscribe({
      next: res => {
        this.promos = res?.data?.t ?? [];
        this.totalPaginas = res?.data?.totalPaginas ?? 1;
        this.cargando = false;
        this.promos.forEach(p => this.iniciarCountdown(p));
      },
      error: err => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? 'No se pudieron cargar las promociones.' });
      }
    });
  }

  paginaAnterior(): void {
    if (this.pagina > 1) { this.pagina--; this.cargar(); }
  }

  paginaSiguiente(): void {
    if (this.pagina < this.totalPaginas) { this.pagina++; this.cargar(); }
  }

  // ── Countdown ─────────────────────────────────────────────────────────

  private iniciarCountdown(p: IPromocion): void {
    const calcular = () => {
      const diff = new Date(p.fechaVencimiento).getTime() - Date.now();
      if (diff <= 0) { this.countdowns.set(p.id, 'Vencida'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0 || d > 0) parts.push(`${h}h`);
      parts.push(`${m}m`);
      if (d === 0) parts.push(`${s}s`);
      this.countdowns.set(p.id, parts.join(' '));
    };
    calcular();
    const t = setInterval(calcular, 1000);
    this.timers.push(t);
  }

  countdown(p: IPromocion): string {
    return this.countdowns.get(p.id) ?? '…';
  }

  // ── Precios ───────────────────────────────────────────────────────────

  precioTotalNormal(p: IPromocion): number {
    return p.detalles.reduce((s, d) => s + (d.precioNormal ?? 0) * d.cantidad, 0);
  }

  precioTotalPromo(p: IPromocion): number {
    return p.detalles.reduce((s, d) => s + d.precioEnPromocion * d.cantidad, 0);
  }

  ahorro(p: IPromocion): number {
    return this.precioTotalNormal(p) - this.precioTotalPromo(p);
  }

  // ── Carrito ───────────────────────────────────────────────────────────

  cantidadEnCarrito(p: IPromocion): number {
    return this.carritoService.cantidadPromoEnCarrito(p.id);
  }

  estaEnCarrito(p: IPromocion): boolean {
    return this.cantidadEnCarrito(p) > 0;
  }

  agregarDirecto(p: IPromocion): void {
    if ((p.instanciasDisponibles ?? 0) <= 0) {
      Swal.fire({ icon: 'info', title: 'Sin disponibilidad', text: 'Esta promoción no tiene unidades disponibles.', timer: 1800, showConfirmButton: false });
      return;
    }
    if ((p.instanciasDisponibles ?? 0) === 1) {
      this.carritoService.agregarPromo(p, 1);
    } else {
      this.abrirDetalle(p);
    }
  }

  // ── Detalle / selector de cantidad ───────────────────────────────────

  abrirDetalle(p: IPromocion): void {
    this.promoDetalle = p;
    const enCarrito = this.cantidadEnCarrito(p);
    this.cantidadDetalle = enCarrito > 0 ? enCarrito : 1;
  }

  cerrarDetalle(): void {
    this.promoDetalle = null;
    this.cantidadDetalle = 1;
  }

  decrementarCantidad(): void {
    if (this.cantidadDetalle > 1) this.cantidadDetalle--;
  }

  incrementarCantidad(): void {
    const max = this.promoDetalle?.instanciasDisponibles ?? 1;
    if (this.cantidadDetalle < max) this.cantidadDetalle++;
  }

  confirmarAgregar(): void {
    if (!this.promoDetalle) return;
    const actual = this.cantidadEnCarrito(this.promoDetalle);
    if (actual > 0) {
      // Reemplazar cantidad: quitar todas y agregar la nueva cantidad
      this.carritoService.quitarPromo(this.promoDetalle.id);
    }
    this.carritoService.agregarPromo(this.promoDetalle, this.cantidadDetalle);
    Swal.fire({
      icon: 'success',
      title: '¡Agregado al carrito!',
      text: `${this.cantidadDetalle} combo(s) de "${this.promoDetalle.descripcion}"`,
      timer: 1400,
      showConfirmButton: false
    });
    this.cerrarDetalle();
  }

  quitarDelCarrito(p: IPromocion): void {
    this.carritoService.quitarPromo(p.id);
  }

  labelDetalle(d: { nombreProducto?: string; talla?: string; color?: string; marca?: string; varianteId: number }): string {
    return [d.nombreProducto, d.talla, d.color, d.marca].filter(Boolean).join(' · ') || `Variante #${d.varianteId}`;
  }
}
