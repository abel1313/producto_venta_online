import { Directive, ElementRef, OnDestroy, OnInit, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Para campos que nunca llevan números (el color). Quita lo que no sea letra, espacio, guion o
 * diagonal, al escribir y al pegar. Va junto a appUppercase: <input appUppercase appSoloLetras>.
 */
@Directive({ selector: 'input[appSoloLetras]' })
export class SoloLetrasInputDirective implements OnInit, OnDestroy {
  private readonly handler = (): void => this.limpiar();

  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    @Optional() @Self() private readonly ngControl: NgControl
  ) {}

  ngOnInit(): void { this.el.nativeElement.addEventListener('input', this.handler, true); }
  ngOnDestroy(): void { this.el.nativeElement.removeEventListener('input', this.handler, true); }

  private limpiar(): void {
    const input = this.el.nativeElement;
    const limpio = input.value.replace(/[^\p{L}\s\-\/]/gu, '');
    if (limpio === input.value) return;
    const pos = (input.selectionStart ?? limpio.length) - (input.value.length - limpio.length);
    input.value = limpio;
    try { input.setSelectionRange(Math.max(pos, 0), Math.max(pos, 0)); } catch { /* no aplica */ }
    this.ngControl?.control?.setValue(limpio, { emitEvent: false });
  }
}
