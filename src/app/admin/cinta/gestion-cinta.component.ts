import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ICintaItem } from 'src/app/cinta/models/cinta.model';
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

  private destroy$ = new Subject<void>();

  constructor(private readonly cinta: CintaService) {}

  ngOnInit(): void {
    this.cinta.items$.pipe(takeUntil(this.destroy$)).subscribe(items => this.items = items);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activos(): number {
    return this.items.filter(i => i.activo).length;
  }

  agregar(): void {
    if (!this.nuevoTexto.trim()) return;
    this.cinta.agregar(this.nuevoTexto);
    this.nuevoTexto = '';
  }

  editar(item: ICintaItem): void {
    this.editandoId = item.id;
    this.textoEditado = item.texto;
  }

  guardarEdicion(): void {
    if (this.editandoId === null || !this.textoEditado.trim()) return;
    this.cinta.actualizar(this.editandoId, this.textoEditado);
    this.cancelarEdicion();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.textoEditado = '';
  }

  toggle(item: ICintaItem): void { this.cinta.toggleActivo(item.id); }
  subir(item: ICintaItem): void  { this.cinta.mover(item.id, -1); }
  bajar(item: ICintaItem): void  { this.cinta.mover(item.id, 1); }

  eliminar(item: ICintaItem): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar esta frase?',
      text: item.texto,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => { if (r.isConfirmed) this.cinta.eliminar(item.id); });
  }

  restaurar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Volver a las frases originales?',
      text: 'Se pierde todo lo que hayas escrito aquí.',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
    }).then(r => { if (r.isConfirmed) this.cinta.restaurar(); });
  }
}
