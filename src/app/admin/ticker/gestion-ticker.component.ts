import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { ITickerItem } from 'src/app/ticker/models/ticker.model';
import { TickerService } from 'src/app/ticker/service/ticker.service';

@Component({
  selector: 'app-gestion-ticker',
  templateUrl: './gestion-ticker.component.html',
  styleUrls: ['./gestion-ticker.component.scss']
})
export class GestionTickerComponent implements OnInit, OnDestroy {

  items: ITickerItem[] = [];

  nuevoTexto = '';

  editandoId: number | null = null;
  textoEditado = '';

  private destroy$ = new Subject<void>();

  constructor(private readonly ticker: TickerService) {}

  ngOnInit(): void {
    this.ticker.items$.pipe(takeUntil(this.destroy$)).subscribe(items => this.items = items);
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
    this.ticker.agregar(this.nuevoTexto);
    this.nuevoTexto = '';
  }

  editar(item: ITickerItem): void {
    this.editandoId = item.id;
    this.textoEditado = item.texto;
  }

  guardarEdicion(): void {
    if (this.editandoId === null || !this.textoEditado.trim()) return;
    this.ticker.actualizar(this.editandoId, this.textoEditado);
    this.cancelarEdicion();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.textoEditado = '';
  }

  toggle(item: ITickerItem): void { this.ticker.toggleActivo(item.id); }
  subir(item: ITickerItem): void  { this.ticker.mover(item.id, -1); }
  bajar(item: ITickerItem): void  { this.ticker.mover(item.id, 1); }

  eliminar(item: ITickerItem): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Quitar esta frase?',
      text: item.texto,
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(r => { if (r.isConfirmed) this.ticker.eliminar(item.id); });
  }

  restaurar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Volver a las frases originales?',
      text: 'Se pierde todo lo que hayas escrito aquí.',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
    }).then(r => { if (r.isConfirmed) this.ticker.restaurar(); });
  }
}
