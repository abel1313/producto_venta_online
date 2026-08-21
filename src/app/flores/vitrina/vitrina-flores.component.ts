import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { IRamoAccesorioCalculado, IRamoArmado } from '../models/flores.model';
import { FloresService } from '../service/flores.service';
import { NegocioService } from '../../negocio/negocio.service';

/**
 * Vitrina pública de ramos ya armados por el admin (Flujo B). Solo lectura por ahora — todavía
 * no existe un endpoint para confirmar un `RamoArmado` como pedido real, así que esta pantalla
 * no tiene botón de compra. El configurador donde el cliente arma su propio ramo desde cero
 * (Flujo A: especie → cantidad → colores → accesorios → listón) es una pieza aparte, pendiente.
 */
@Component({
  selector: 'app-vitrina-flores',
  templateUrl: './vitrina-flores.component.html',
  styleUrls: ['./vitrina-flores.component.scss']
})
export class VitrinaFloresComponent implements OnInit {

  ramos: IRamoArmado[] = [];
  cargando = false;
  error: string | null = null;

  pagina = 1;
  size = 12;
  totalPaginas = 1;

  ramoDetalle: IRamoArmado | null = null;

  /** Solo lo que hace falta para el botón "Pedir por WhatsApp" — falla en silencio si no hay. */
  private whatsappUrl: string | null = null;

  constructor(
    private readonly flores: FloresService,
    private readonly negocio: NegocioService
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.negocio.getContactosPublicos().subscribe({
      next: c => { this.whatsappUrl = c.whatsappUrl; },
      error: () => { /* sin whatsapp configurado — el botón cae al aviso genérico */ }
    });
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.flores.ramosActivos(this.pagina, this.size).subscribe({
      next: r => {
        this.ramos = r?.t ?? [];
        this.totalPaginas = r?.totalPaginas ?? 1;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        this.error = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudieron cargar los ramos.';
      }
    });
  }

  paginaAnterior(): void {
    if (this.pagina > 1) { this.pagina--; this.cargar(); }
  }

  paginaSiguiente(): void {
    if (this.pagina < this.totalPaginas) { this.pagina++; this.cargar(); }
  }

  // ── Detalle ──────────────────────────────────────────────────────────────

  abrirDetalle(r: IRamoArmado): void { this.ramoDetalle = r; }
  cerrarDetalle(): void { this.ramoDetalle = null; }

  /** Total de accesorios ya viene resuelto por el back en cada línea (subtotal); se suma acá. */
  subtotalAccesorios(r: IRamoArmado): number {
    return (r.accesorios ?? []).reduce((s, a) => s + (a.subtotal ?? 0), 0);
  }

  labelAccesorio(a: IRamoAccesorioCalculado): string {
    return a.cantidad > 1 ? `${a.nombre} × ${a.cantidad}` : a.nombre;
  }

  /**
   * Texto del precio del papel para el detalle: si viene el desglose por pliego (nuevo), lo
   * muestra explícito; si no (accesorio sin `floresPorPliego` configurado, o ramo guardado antes
   * de esa fórmula), muestra solo el total fijo — mismo criterio que el back documentó.
   */
  precioPapelTexto(r: IRamoArmado): string {
    if (r.pliegosPapel && r.precioUnitarioPapel != null) {
      return `${r.pliegosPapel} pliego(s) × $${r.precioUnitarioPapel.toFixed(2)}`;
    }
    return '';
  }

  /**
   * Sin endpoint todavía para confirmar un ramo armado como pedido real (ver nota de la clase),
   * así que "pedirlo" hoy es contactar directo — abre WhatsApp si el negocio lo tiene configurado
   * (mismo dato que ya alimenta el QR de WhatsApp de los tickets), o un aviso genérico si no.
   */
  contactar(r: IRamoArmado): void {
    if (this.whatsappUrl) {
      window.open(this.whatsappUrl, '_blank');
      return;
    }
    Swal.fire({
      icon: 'info',
      title: 'Pídelo por este medio',
      html: `Por ahora este ramo se pide directo con nosotros — escríbenos y te lo apartamos:<br><br><b>${r.nombre}</b> — $${r.precioTotal.toFixed(2)}`,
      confirmButtonText: 'Entendido'
    });
  }
}
