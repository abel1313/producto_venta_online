import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CINTA_SUGERIDAS, ICintaItem } from 'src/app/cinta/models/cinta.model';
import { CintaService } from 'src/app/cinta/service/cinta.service';

@Component({
  selector: 'app-gestion-cinta',
  templateUrl: './gestion-cinta.component.html',
  styleUrls: ['./gestion-cinta.component.scss']
})
export class GestionCintaComponent implements OnInit, OnDestroy {

  items: ICintaItem[] = [];

  nuevoTexto = '';

  editandoId: number | null = null;
  textoEditado = '';

  /** Guard de re-entrada: cubre TODA la cadena (mutación + recarga), no solo la primera llamada. */
  guardando = false;
  cargando = false;
  error: string | null = null;

  readonly maxLargo = 120;

  private destroy$ = new Subject<void>();

  constructor(private readonly cinta: CintaService) {}

  ngOnInit(): void {
    this.cinta.items$.pipe(takeUntil(this.destroy$)).subscribe(items => this.items = items);
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activos(): number {
    return this.items.filter(i => i.activo).length;
  }

  /** El botón de sugeridas solo aparece con la lista vacía — si no, duplicaría frases. */
  get puedeSembrar(): boolean {
    return !this.cargando && !this.error && this.items.length === 0;
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.cinta.cargarTodas().subscribe({
      next: () => { this.cargando = false; },
      error: err => {
        this.cargando = false;
        this.error = this.mensaje(err, 'No se pudo cargar la lista de frases.');
      }
    });
  }

  agregar(): void {
    const texto = this.nuevoTexto.trim();
    if (!texto || this.guardando) return;
    this.ejecutar(this.cinta.crear(texto), () => { this.nuevoTexto = ''; }, 'No se pudo agregar la frase.');
  }

  editar(item: ICintaItem): void {
    this.editandoId = item.id;
    this.textoEditado = item.texto;
  }

  guardarEdicion(): void {
    const texto = this.textoEditado.trim();
    if (this.editandoId === null || !texto || this.guardando) return;
    const item = this.items.find(i => i.id === this.editandoId);
    if (!item) return;
    this.ejecutar(
      this.cinta.actualizar({ ...item, texto }),
      () => this.cancelarEdicion(),
      'No se pudo guardar el cambio.'
    );
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.textoEditado = '';
  }

  toggle(item: ICintaItem): void {
    if (this.guardando) return;
    this.ejecutar(
      this.cinta.actualizar({ ...item, activo: !item.activo }),
      undefined,
      'No se pudo cambiar el estado de la frase.'
    );
  }

  subir(item: ICintaItem): void {
    if (this.guardando) return;
    this.ejecutar(this.cinta.mover(item.id, -1), undefined, 'No se pudo reordenar.');
  }

  bajar(item: ICintaItem): void {
    if (this.guardando) return;
    this.ejecutar(this.cinta.mover(item.id, 1), undefined, 'No se pudo reordenar.');
  }

  eliminar(item: ICintaItem): void {
    if (this.guardando) return;
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar esta frase?',
      text: item.texto,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) this.ejecutar(this.cinta.eliminar(item.id), undefined, 'No se pudo quitar la frase.');
    });
  }

  sembrarSugeridas(): void {
    if (this.guardando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Cargar las frases sugeridas?',
      text: CINTA_SUGERIDAS.join(' · '),
      showCancelButton: true,
      confirmButtonText: 'Sí, cargarlas',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (r.isConfirmed) {
        this.ejecutar(this.cinta.crearVarias(CINTA_SUGERIDAS), undefined, 'No se pudieron cargar las frases.');
      }
    });
  }

  /**
   * Corre una mutación y recarga la lista.
   *
   * `guardando` se libera **solo al terminar la recarga**, no en el `next` de la mutación:
   * entre una y otra el botón volvería a estar habilitado y un segundo clic mandaría la misma
   * alta/edición otra vez, con datos ya guardados.
   *
   * Recarga desde el servidor en vez de parchar el arreglo local porque el `orden` y los ids
   * los decide el back — parchando a mano se desincroniza en cuanto un reordenamiento toca
   * más filas de las esperadas.
   */
  private ejecutar(accion: Observable<unknown>, alExito: (() => void) | undefined, fallback: string): void {
    this.guardando = true;
    this.error = null;
    accion.subscribe({
      next: () => {
        if (alExito) alExito();
        this.cinta.cargarTodas().subscribe({
          next: () => {
            this.guardando = false;
            // La cinta de arriba se refresca sola, sin recargar la página.
            this.cinta.cargarActivos();
          },
          error: err => {
            this.guardando = false;
            this.error = this.mensaje(err, 'Se guardó, pero no se pudo refrescar la lista.');
          }
        });
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.mensaje(err, fallback) });
      }
    });
  }

  private mensaje(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
