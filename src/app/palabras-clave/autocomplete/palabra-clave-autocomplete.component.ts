import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { IPalabraClave } from '../models/palabra-clave.model';
import { PalabraClaveService } from '../service/palabra-clave.service';

// Autocomplete reutilizable para seleccionar palabra clave en formularios
// de producto y variante. Emite el objeto IPalabraClave seleccionado o null al limpiar.
@Component({
  selector: 'app-palabra-clave-autocomplete',
  templateUrl: './palabra-clave-autocomplete.component.html',
  styleUrls: ['./palabra-clave-autocomplete.component.scss']
})
export class PalabraClaveAutocompleteComponent implements OnInit, OnDestroy {

  // Permite precargar la palabra clave cuando se edita un producto/variante existente
  @Input() set valorInicial(v: IPalabraClave | null | undefined) {
    if (v) {
      this.termino   = v.nombre;
      this.seleccion = v;
    }
  }

  // Emite cada vez que el usuario selecciona o limpia la palabra clave
  @Output() seleccionada = new EventEmitter<IPalabraClave | null>();

  termino    = '';
  opciones: IPalabraClave[] = [];
  seleccion: IPalabraClave | null = null;
  buscando   = false;

  private input$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private readonly svc: PalabraClaveService) {}

  ngOnInit(): void {
    this.input$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(t => {
        if (t.length < 2) { this.opciones = []; return []; }
        this.buscando = true;
        return this.svc.buscar(t);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => { this.opciones = res; this.buscando = false; },
      error: ()  => { this.buscando = false; }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onInput(): void {
    // Si el usuario borró lo que había elegido, limpiamos la selección
    if (this.seleccion && this.termino !== this.seleccion.nombre) {
      this.seleccion = null;
      this.seleccionada.emit(null);
    }
    this.input$.next(this.termino);
  }

  elegir(p: IPalabraClave): void {
    this.seleccion = p;
    this.termino   = p.nombre;
    this.opciones  = [];
    this.seleccionada.emit(p);
  }

  limpiar(): void {
    this.seleccion = null;
    this.termino   = '';
    this.opciones  = [];
    this.seleccionada.emit(null);
  }
}
