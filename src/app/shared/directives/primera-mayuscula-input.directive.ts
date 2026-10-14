import { Directive, ElementRef, OnDestroy, OnInit, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Estilo oración: solo la primera letra en mayúscula y el resto en minúscula ("Colonia centro"). */
@Directive({ selector: 'input[appPrimeraMayuscula]' })
export class PrimeraMayusculaInputDirective implements OnInit, OnDestroy {
  private readonly handler = (): void => this.aplicar();

  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    @Optional() @Self() private readonly ngControl: NgControl
  ) {}

  ngOnInit(): void { this.el.nativeElement.addEventListener('input', this.handler, true); }
  ngOnDestroy(): void { this.el.nativeElement.removeEventListener('input', this.handler, true); }

  private aplicar(): void {
    const input = this.el.nativeElement;
    const v = input.value;
    const nuevo = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    if (nuevo === v) return;
    const pos = input.selectionStart ?? nuevo.length;
    input.value = nuevo;
    try { input.setSelectionRange(pos, pos); } catch { /* no aplica */ }
    this.ngControl?.control?.setValue(nuevo, { emitEvent: false });
  }
}
