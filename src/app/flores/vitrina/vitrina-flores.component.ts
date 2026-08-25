import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { IRamoAccesorioCalculado, IRamoArmado } from '../models/flores.model';
import { FloresService } from '../service/flores.service';
import { FloresImagenService } from '../service/flores-imagen.service';
import { NegocioService } from '../../negocio/negocio.service';

/**
 * Vitrina pública de ramos ya armados por el admin (Flujo B).
 *
 * "Pedir este ramo" lleva al configurador (`/flores/configurar`) precargado con las
 * flores/accesorios de este ramo — no existe un endpoint que confirme un `RamoArmado` como
 * pedido directamente (solo listados paginados), así que se reutiliza TODO el checkout ya
 * probado del configurador de armado libre (Flujo A) en vez de duplicar esa lógica acá. Ver
 * `ConfigurarRamoComponent.precargarDesdeRamoArmado()`.
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

  /**
   * Foto real de cada ramo, indexada por el id de su **variante sombra**.
   *
   * ⚠️ Los ramos guardados antes de esta función tienen `varianteId: null` — su variante se crea
   * sola en el siguiente guardado. Por eso `fotoDe()` cae a `imagenUrl` (el link que el admin
   * pegaba a mano) mientras tanto, y solo entonces al marcador de posición.
   */
  fotos: Record<number, string | null> = {};

  constructor(
    private readonly flores: FloresService,
    private readonly negocio: NegocioService,
    private readonly imagenes: FloresImagenService,
    private readonly router: Router
  ) {}

  /** Qué imagen mostrar para un ramo: la foto real, el link viejo, o nada. */
  fotoDe(r: IRamoArmado): string | null {
    return (r.varianteId ? this.fotos[r.varianteId] : null) ?? r.imagenUrl ?? null;
  }

  private cargarFotos(ramos: IRamoArmado[]): void {
    ramos
      .filter(r => !!r.varianteId && this.fotos[r.varianteId!] === undefined)
      .forEach(r => {
        const id = r.varianteId!;
        this.fotos[id] = null;                      // marca "ya pedida", para no repetirla
        this.imagenes.portadaDe(id).subscribe(url => { this.fotos[id] = url; });
      });
  }

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
        this.cargarFotos(this.ramos);
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
   * El papel NO se le muestra al cliente como línea aparte — no es una decisión suya, va
   * incluido siempre que aplique y se cobra por dentro (mismo criterio ya establecido en "Arma
   * tu ramo": el costo se funde en la línea de flores, nunca se esconde del total). Sin esto el
   * total no cuadraría contra la suma de lo visible.
   */
  subtotalFloresConPapel(r: IRamoArmado): number {
    return r.precioFlores + (r.papelIncluido ? r.precioPapel : 0);
  }

  /**
   * Lleva al configurador con este ramo ya precargado (flores, accesorios) — desde ahí el
   * cliente ajusta si quiere, elige fecha y zona de entrega, y confirma el pedido real con el
   * mismo checkout ya probado del armado libre. Ver nota de la clase.
   */
  pedirRamo(r: IRamoArmado): void {
    this.router.navigate(['/flores/configurar'], { state: { ramoArmado: r } });
  }

  /** Escape hatch para quien prefiere solo preguntar antes de comprometerse — no es el flujo
   * principal, por eso vive aparte de `pedirRamo()`. */
  contactarPorWhatsapp(r: IRamoArmado): void {
    if (this.whatsappUrl) {
      window.open(this.whatsappUrl, '_blank');
      return;
    }
    Swal.fire({
      icon: 'info',
      title: 'Escríbenos',
      html: `Este negocio todavía no tiene WhatsApp configurado — usa el botón "Pedir este ramo" para hacer tu pedido directo:<br><br><b>${r.nombre}</b> — $${r.precioTotal.toFixed(2)}`,
      confirmButtonText: 'Entendido'
    });
  }
}
