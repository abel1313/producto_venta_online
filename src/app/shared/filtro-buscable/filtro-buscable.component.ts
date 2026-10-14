import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { normalizarOpcion, ordenarOpciones } from '../orden-opciones.util';

/**
 * Filtro con buscador en lugar de un <select> enorme (talla / color / marca). Se escribe, la lista
 * se acorta, y todo se ve y se manda en MAYÚSCULAS. Letras primero, números después.
 */
@Component({
  selector: 'app-filtro-buscable',
  templateUrl: './filtro-buscable.component.html',
  styleUrls: ['./filtro-buscable.component.scss']
})
export class FiltroBuscableComponent {
  @Input() etiqueta = '';
  @Input() set opciones(valor: string[] | null | undefined) { this.ordenadas = ordenarOpciones(valor ?? []); }
  @Input() valor = '';
  @Output() valorChange = new EventEmitter<string>();

  ordenadas: string[] = [];
  abierto = false;
  texto = '';

  constructor(private readonly ref: ElementRef<HTMLElement>) {}

  get filtradas(): string[] {
    const t = normalizarOpcion(this.texto);
    return t ? this.ordenadas.filter(o => o.includes(t)) : this.ordenadas;
  }

  abrir(): void { this.abierto = true; this.texto = ''; }

  escribir(valor: string): void { this.texto = normalizarOpcion(valor); this.abierto = true; }

  elegir(opcion: string): void {
    this.valor = opcion;
    this.texto = '';
    this.abierto = false;
    this.valorChange.emit(opcion);
  }

  limpiar(evento: Event): void {
    evento.stopPropagation();
    this.elegir('');
  }

  @HostListener('document:click', ['$event'])
  clicFuera(e: Event): void {
    if (this.abierto && !this.ref.nativeElement.contains(e.target as Node)) this.abierto = false;
  }
}
