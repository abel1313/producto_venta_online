import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ICantidadFlor } from '../models/flores.model';
import { FloresService } from '../service/flores.service';

/**
 * Configuración de entregas por tamaño de ramo — pantalla de administración.
 *
 * El dueño define, por cada tamaño, cuánto tarda en armarlo y a qué hora lo entrega: un plazo
 * normal y (si aplica) uno urgente con su cargo. Con eso, `POST /v1/flores/fechas-disponibles`
 * le ofrece al cliente **solo las fechas que el taller puede cumplir**, en vez de dejarlo pedir
 * algo imposible y rechazarlo después.
 *
 * ⚠️ **Esto NO tiene tabla ni endpoints propios.** Los 6 campos cuelgan de `CantidadFlorValida` y
 * se guardan con el CRUD de siempre (`/v1/cantidades-flor`) — se propuso así y el back lo aceptó,
 * para que el dueño no registre el mismo tamaño en dos lugares y se le desalineen. Por eso esta
 * pantalla **no crea ni borra tamaños**: solo edita los que ya existen en Catálogos → Cantidades.
 *
 * Reglas que dependen de esto (no romperlas al tocar la pantalla):
 * - Una cantidad sin configuración propia usa la del **tamaño inmediato superior** (37 → 48). El
 *   redondeo es hacia arriba, nunca hacia abajo.
 * - Si el bloque urgente queda vacío, ese tamaño **no se puede apurar** y al cliente ni se le
 *   muestra el botón.
 * - `horaLimitePedido` vale para pedir **y para pagar**: si el pago se pasa, el pedido se
 *   recotiza con el cargo urgente.
 */
@Component({
  selector: 'app-config-entregas',
  templateUrl: './config-entregas.component.html',
  styleUrls: ['./config-entregas.component.scss']
})
export class ConfigEntregasComponent implements OnInit {

  cantidades: ICantidadFlor[] = [];

  cargando = false;
  /** Guard de re-entrada: se libera al terminar la recarga, no en el next de la mutación. */
  guardando = false;
  error: string | null = null;

  editandoId: number | null = null;
  form = this.vacio();

  constructor(private readonly flores: FloresService) {}

  ngOnInit(): void { this.cargar(); }

  private vacio() {
    return {
      diasNormal: null as number | null,
      horaEntregaNormal: '',
      ofreceUrgente: false,
      diasUrgente: null as number | null,
      horaEntregaUrgente: '',
      horaLimitePedido: '',
      cargoUrgente: null as number | null
    };
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.flores.cantidadesGetAll().subscribe({
      next: cs => { this.cantidades = cs.filter(c => c.activo); this.cargando = false; },
      error: err => {
        this.cargando = false;
        this.error = this.msg(err, 'No se pudieron cargar los tamaños de ramo.');
      }
    });
  }

  /** Cuántos tamaños ya tienen al menos el plazo normal — para el resumen de arriba. */
  get configurados(): number {
    return this.cantidades.filter(c => c.diasNormal != null).length;
  }

  /**
   * El back manda las horas como `HH:mm:ss` ("16:00:00") pero un `<input type="time">` solo
   * entiende `HH:mm` — si se le pasa el valor con segundos, el campo se queda vacío sin avisar.
   */
  private aInput(hora: string | null): string {
    return hora ? hora.slice(0, 5) : '';
  }

  /** Y de regreso: se completa a `HH:mm:ss`, que es lo que el back guarda como hora. */
  private aBack(hora: string): string | null {
    if (!hora) return null;
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  editar(c: ICantidadFlor): void {
    this.editandoId = c.id;
    this.form = {
      diasNormal: c.diasNormal,
      horaEntregaNormal: this.aInput(c.horaEntregaNormal),
      ofreceUrgente: c.diasUrgente != null,
      diasUrgente: c.diasUrgente,
      horaEntregaUrgente: this.aInput(c.horaEntregaUrgente),
      horaLimitePedido: this.aInput(c.horaLimitePedido),
      cargoUrgente: c.cargoUrgente
    };
  }

  cancelar(): void {
    this.editandoId = null;
    this.form = this.vacio();
  }

  get formValido(): boolean {
    if (!this.form.diasNormal || !this.form.horaEntregaNormal) return false;
    if (!this.form.ofreceUrgente) return true;
    return !!this.form.diasUrgente && !!this.form.horaEntregaUrgente && !!this.form.horaLimitePedido;
  }

  guardar(): void {
    if (!this.formValido || this.guardando || this.editandoId === null) return;
    const c = this.cantidades.find(x => x.id === this.editandoId);
    if (!c || !c.tipoFlor) return;

    this.guardando = true;
    // Se manda el objeto completo porque el CRUD genérico reemplaza el registro: si se omitieran
    // `pliegos` o `manoDeObra`, se borrarían al guardar la configuración de entrega.
    this.flores.cantidadUpdate({
      id: c.id,
      tipoFlor: { id: c.tipoFlor.id },
      cantidad: c.cantidad,
      pliegos: c.pliegos,
      manoDeObra: c.manoDeObra,
      horasMinimasAnticipacion: c.horasMinimasAnticipacion,
      precioUrgencia: c.precioUrgencia,
      diasNormal: this.form.diasNormal,
      horaEntregaNormal: this.aBack(this.form.horaEntregaNormal),
      // Si no ofrece urgente, todo el bloque va en null: así el back sabe que ese tamaño no se
      // puede apurar y `fechas-disponibles` responde `ofreceUrgente:false`.
      diasUrgente:        this.form.ofreceUrgente ? this.form.diasUrgente : null,
      horaEntregaUrgente: this.form.ofreceUrgente ? this.aBack(this.form.horaEntregaUrgente) : null,
      horaLimitePedido:   this.form.ofreceUrgente ? this.aBack(this.form.horaLimitePedido) : null,
      cargoUrgente:       this.form.ofreceUrgente ? this.form.cargoUrgente : null,
      activo: c.activo
    }).subscribe({
      next: () => {
        this.cancelar();
        // La recarga es parte de la cadena: `guardando` no se libera antes de que termine.
        this.flores.cantidadesGetAll().subscribe({
          next: cs => { this.cantidades = cs.filter(x => x.activo); this.guardando = false; },
          error: err => {
            this.guardando = false;
            this.error = this.msg(err, 'Se guardó, pero no se pudo refrescar la lista.');
          }
        });
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo guardar la configuración.') });
      }
    });
  }

  /** Deja el tamaño sin plazos — vuelve a quedar bloqueado para pedidos. */
  limpiar(c: ICantidadFlor): void {
    if (this.guardando) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar los plazos de este tamaño?',
      text: `${c.cantidad} flores — sin plazos, el cliente no va a poder pedirlo y se le pedirá que te contacte.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed || !c.tipoFlor) return;
      this.editandoId = c.id;
      this.form = this.vacio();
      // Se reutiliza el mismo guardado, con el bloque normal también vacío.
      this.guardando = true;
      this.flores.cantidadUpdate({
        id: c.id, tipoFlor: { id: c.tipoFlor.id }, cantidad: c.cantidad,
        pliegos: c.pliegos, manoDeObra: c.manoDeObra,
        horasMinimasAnticipacion: c.horasMinimasAnticipacion, precioUrgencia: c.precioUrgencia,
        diasNormal: null, horaEntregaNormal: null,
        diasUrgente: null, horaEntregaUrgente: null, horaLimitePedido: null, cargoUrgente: null,
        activo: c.activo
      }).subscribe({
        next: () => {
          this.cancelar();
          this.flores.cantidadesGetAll().subscribe({
            next: cs => { this.cantidades = cs.filter(x => x.activo); this.guardando = false; },
            error: () => { this.guardando = false; this.cargar(); }
          });
        },
        error: err => {
          this.guardando = false;
          Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo quitar la configuración.') });
        }
      });
    });
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
