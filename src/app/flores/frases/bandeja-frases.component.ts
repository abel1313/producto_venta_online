import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { IFrasePendiente } from '../models/flores.model';
import { FloresService } from '../service/flores.service';

/**
 * Bandeja de frases de listón por aprobar — ADMIN.
 *
 * Cuando el cliente escribe **su propia frase** (en vez de elegir una del catálogo), no hay precio
 * que cobrarle: el ramo se cotiza y se guarda con un total **provisional**, y la frase queda
 * esperando a que el dueño le ponga precio. Esta pantalla es donde lo hace.
 *
 * ⚠️ **El ramo YA está vendido y guardado** — lo único pendiente es la frase. No confundir con el
 * caso del correo sin verificar (ahí no se guarda nada; ver la sección cancelada en CLAUDE.md).
 *
 * Al aprobar, el back **no toca el pedido original**: crea un pedido `APARTADO` aparte, solo con
 * esa frase, y devuelve su id para cobrar el anticipo con el módulo de abonos de siempre.
 */
@Component({
  selector: 'app-bandeja-frases',
  templateUrl: './bandeja-frases.component.html',
  styleUrls: ['./bandeja-frases.component.scss']
})
export class BandejaFrasesComponent implements OnInit {

  frases: IFrasePendiente[] = [];
  cargando = false;
  error: string | null = null;

  /** Guard de re-entrada por fila: dos clics seguidos aprobarían la misma frase dos veces. */
  procesandoId: number | null = null;

  /** Precio que el dueño le pone a cada frase, por `detalleId`. */
  precios: { [detalleId: number]: number | null } = {};

  pagina = 1;
  readonly size = 10;
  totalPaginas = 1;
  totalRegistros = 0;

  constructor(
    private readonly flores: FloresService,
    private readonly router: Router
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.flores.frasesPendientes(this.pagina, this.size).subscribe({
      next: r => {
        this.frases = r?.t ?? [];
        this.totalPaginas = r?.totalPaginas ?? 1;
        this.totalRegistros = r?.totalRegistros ?? this.frases.length;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        this.error = this.msg(err, 'No se pudieron cargar las frases pendientes.');
      }
    });
  }

  paginaAnterior(): void { if (this.pagina > 1) { this.pagina--; this.cargar(); } }
  paginaSiguiente(): void { if (this.pagina < this.totalPaginas) { this.pagina++; this.cargar(); } }

  aprobar(f: IFrasePendiente): void {
    const precio = this.precios[f.detalleId];
    if (!precio || precio <= 0) {
      Swal.fire({ icon: 'warning', title: 'Falta el precio', text: 'Ponle un precio a la frase antes de aprobarla.' });
      return;
    }
    if (this.procesandoId !== null) return;
    this.procesandoId = f.detalleId;

    this.flores.validarFrase(f.detalleId, { aprobar: true, precioAsignado: precio }).subscribe({
      next: r => {
        this.procesandoId = null;
        // El back crea un pedido APARTADO aparte para el anticipo. Se ofrece ir a cobrarlo de
        // una vez: si el dueño tiene que buscarlo a mano después, se queda sin cobrar.
        if (r?.pedidoAnticipoId) {
          Swal.fire({
            icon: 'success',
            title: 'Frase aprobada',
            html: `<p>Se generó el anticipo del pedido #${r.pedidoAnticipoId}.</p>` +
                  (r.montoAnticipo != null ? `<p>Monto a cobrar: <b>$${r.montoAnticipo.toFixed(2)}</b></p>` : ''),
            showCancelButton: true,
            confirmButtonText: 'Ir a cobrar el anticipo',
            cancelButtonText: 'Después'
          }).then(res => {
            this.cargar();
            if (res.isConfirmed) this.router.navigate(['/abonos'], { queryParams: { pedidoId: r.pedidoAnticipoId } });
          });
        } else {
          Swal.fire({ icon: 'success', title: 'Frase aprobada', text: 'Ya tiene precio asignado.' })
            .then(() => this.cargar());
        }
      },
      error: err => {
        this.procesandoId = null;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo aprobar la frase.') });
      }
    });
  }

  rechazar(f: IFrasePendiente): void {
    if (this.procesandoId !== null) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Rechazar esta frase?',
      html: `<p style="font-style:italic">«${f.fraseTexto}»</p>
             <p>El ramo del pedido #${f.pedidoId} sigue en pie — solo se descarta la frase del listón.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.procesandoId = f.detalleId;
      this.flores.validarFrase(f.detalleId, { aprobar: false }).subscribe({
        next: () => { this.procesandoId = null; this.cargar(); },
        error: err => {
          this.procesandoId = null;
          Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo rechazar la frase.') });
        }
      });
    });
  }

  verPedido(f: IFrasePendiente): void {
    this.router.navigate(['/pedidos/mis-pedidos'], { queryParams: { buscar: f.pedidoId } });
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
