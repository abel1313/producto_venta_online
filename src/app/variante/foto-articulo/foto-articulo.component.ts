import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import Swal from 'sweetalert2';
import { comprimirImagen } from '../../shared/imagen-comprimir.util';
import { EscanerReceptorService } from '../../shared/escaner-celular/escaner-receptor.service';
import { FotoCelularComponent } from '../../shared/foto-celular/foto-celular.component';
import { VarianteService } from '../service/variante.service';

/**
 * «📷 Agregar foto» de una tarjeta de Buscar que no tiene imagen: la foto se elige de la computadora o se toma con el CELULAR de la misma cuenta
 * (queda escuchando mientras el cuadro está abierto) y se agrega al artículo sin tocar nada más de él (`POST /v1/variantes/{id}/imagenes`).
 */
@Component({
  selector: 'app-foto-articulo',
  templateUrl: './foto-articulo.component.html',
  styleUrls: ['./foto-articulo.component.scss']
})
export class FotoArticuloComponent implements OnChanges, OnDestroy {
  /** El artículo al que se le agrega la foto; `null` = cuadro cerrado. */
  @Input() articulo: { id: number; nombre: string } | null = null;
  @Output() cerrado = new EventEmitter<void>();
  @Output() agregada = new EventEmitter<number>();

  subiendo = false;
  private desregistrar: (() => void) | null = null;

  constructor(private readonly receptor: EscanerReceptorService, private readonly varianteService: VarianteService) {}

  get visible(): boolean { return this.articulo !== null; }

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['articulo']) return;
    this.desregistrar?.();
    this.desregistrar = null;
    if (this.articulo) {
      this.desregistrar = this.receptor.registrarFotos(dataUrl => {
        const archivo = FotoCelularComponent.aArchivo(dataUrl);
        if (archivo) void this.subir(archivo);
      });
    }
  }

  ngOnDestroy(): void { this.desregistrar?.(); }

  alElegir(e: Event): void {
    const input = e.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) void this.subir(archivo);
  }

  cerrar(): void {
    if (!this.subiendo) this.cerrado.emit();
  }

  private async subir(archivo: File): Promise<void> {
    const articulo = this.articulo;
    if (!articulo || this.subiendo) return;
    this.subiendo = true;
    try {
      const imagen = await comprimirImagen(archivo);
      this.varianteService.agregarImagenes(articulo.id, [imagen]).subscribe({
        next: () => {
          this.subiendo = false;
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Foto agregada', showConfirmButton: false, timer: 1800 });
          this.agregada.emit(articulo.id);
          this.cerrado.emit();
        },
        error: err => {
          this.subiendo = false;
          Swal.fire({ icon: 'error', title: 'No se pudo agregar la foto', text: err?.error?.mensaje ?? 'Intenta de nuevo.' });
        }
      });
    } catch (e) {
      this.subiendo = false;
      Swal.fire({ icon: 'warning', title: 'No se pudo abrir la foto', text: (e as Error).message });
    }
  }
}
