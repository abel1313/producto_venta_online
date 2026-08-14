import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { IConfigEntrega } from '../models/config-entrega.model';
import { ICantidadFlor } from '../models/flores.model';
import { ConfigEntregaService } from '../service/config-entrega.service';
import { FloresService } from '../service/flores.service';

/**
 * Configuración de entregas por tamaño de ramo — pantalla de administración.
 *
 * El dueño da de alta, por cada tamaño, cuánto tarda en armarlo y a qué hora lo entrega: un
 * plazo normal y (si aplica) uno urgente con su cargo. Con eso, la pantalla del cliente puede
 * ofrecerle **solo las fechas que el taller sí puede cumplir**, en vez de dejarlo pedir algo
 * imposible y rechazarlo después.
 *
 * ⚠️ Los endpoints todavía no existen — ver `ConfigEntregaService`.
 */
@Component({
  selector: 'app-config-entregas',
  templateUrl: './config-entregas.component.html',
  styleUrls: ['./config-entregas.component.scss']
})
export class ConfigEntregasComponent implements OnInit {

  configs: IConfigEntrega[] = [];
  cantidades: ICantidadFlor[] = [];

  cargando = false;
  /** Guard de re-entrada: se libera al terminar la recarga, no en el next de la mutación. */
  guardando = false;
  error: string | null = null;

  editandoId: number | null = null;

  form = this.vacio();

  constructor(
    private readonly svc: ConfigEntregaService,
    private readonly flores: FloresService
  ) {}

  ngOnInit(): void { this.cargar(); }

  private vacio() {
    return {
      cantidadFlorValidaId: 0,
      diasNormal: null as number | null,
      horaEntregaNormal: '',
      // El bloque urgente es opcional a propósito: hay tamaños que no se pueden apurar.
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
    forkJoin({
      configs: this.svc.getAll(),
      // Se necesitan las cantidades ya dadas de alta para el selector: no se escribe un número
      // suelto, se elige uno de los tamaños que ya existen en el catálogo.
      cantidades: this.flores.cantidadesGetAll()
    }).subscribe({
      next: r => {
        this.configs = r.configs;
        this.cantidades = r.cantidades.filter(c => c.activo);
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        this.error = this.msg(err, 'No se pudo cargar la configuración de entregas.');
      }
    });
  }

  /** Tamaños que todavía no tienen configuración (uno por tamaño, no tiene sentido duplicar). */
  get cantidadesDisponibles(): ICantidadFlor[] {
    if (this.editandoId !== null) return this.cantidades;
    const usadas = new Set(this.configs.map(c => c.cantidadFlorValidaId));
    return this.cantidades.filter(c => !usadas.has(c.id));
  }

  get formValido(): boolean {
    if (!this.form.cantidadFlorValidaId || !this.form.diasNormal || !this.form.horaEntregaNormal) return false;
    if (!this.form.ofreceUrgente) return true;
    return !!this.form.diasUrgente && !!this.form.horaEntregaUrgente && !!this.form.horaLimitePedido;
  }

  nombreCantidad(c: IConfigEntrega): string {
    const n = c.cantidadFlores
      ?? this.cantidades.find(x => x.id === c.cantidadFlorValidaId)?.cantidad;
    return n ? `${n} flores` : '—';
  }

  editar(c: IConfigEntrega): void {
    this.editandoId = c.id;
    this.form = {
      cantidadFlorValidaId: c.cantidadFlorValidaId,
      diasNormal: c.diasNormal,
      horaEntregaNormal: c.horaEntregaNormal ?? '',
      ofreceUrgente: c.diasUrgente != null,
      diasUrgente: c.diasUrgente,
      horaEntregaUrgente: c.horaEntregaUrgente ?? '',
      horaLimitePedido: c.horaLimitePedido ?? '',
      cargoUrgente: c.cargoUrgente
    };
  }

  cancelar(): void {
    this.editandoId = null;
    this.form = this.vacio();
  }

  guardar(): void {
    if (!this.formValido || this.guardando) return;
    const body = {
      id: this.editandoId ?? undefined,
      cantidadFlorValidaId: this.form.cantidadFlorValidaId,
      diasNormal: this.form.diasNormal!,
      horaEntregaNormal: this.form.horaEntregaNormal,
      // Si no ofrece urgente, se manda todo el bloque en null — así el back sabe que ese tamaño
      // no se puede apurar y el cliente no ve el botón.
      diasUrgente:        this.form.ofreceUrgente ? this.form.diasUrgente : null,
      horaEntregaUrgente: this.form.ofreceUrgente ? this.form.horaEntregaUrgente : null,
      horaLimitePedido:   this.form.ofreceUrgente ? this.form.horaLimitePedido : null,
      cargoUrgente:       this.form.ofreceUrgente ? this.form.cargoUrgente : null,
      activo: true
    };
    this.ejecutar(
      this.editandoId !== null ? this.svc.update(body) : this.svc.save(body),
      'No se pudo guardar la configuración.'
    );
  }

  eliminar(c: IConfigEntrega): void {
    if (this.guardando) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar esta configuración?',
      text: `${this.nombreCantidad(c)} — sin ella, ese tamaño deja de tener fechas disponibles.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) this.ejecutar(this.svc.delete(c.id), 'No se pudo quitar la configuración.');
    });
  }

  private ejecutar(accion: Observable<unknown>, fallback: string): void {
    this.guardando = true;
    accion.subscribe({
      next: () => {
        this.cancelar();
        this.svc.getAll().subscribe({
          next: cs => { this.configs = cs; this.guardando = false; },
          error: err => {
            this.guardando = false;
            this.error = this.msg(err, 'Se guardó, pero no se pudo refrescar la lista.');
          }
        });
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, fallback) });
      }
    });
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
