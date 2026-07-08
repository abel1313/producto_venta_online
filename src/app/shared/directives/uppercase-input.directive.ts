import { Directive, ElementRef, OnDestroy, OnInit, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({ selector: 'input[appUppercase], textarea[appUppercase]' })
export class UppercaseInputDirective implements OnInit, OnDestroy {

  // Usamos capture:true para ejecutar ANTES de que ngModel y los (input) del template lean el valor
  private readonly handler = (event: Event): void => this.processUppercase(event);

  constructor(
    private readonly el: ElementRef<HTMLInputElement | HTMLTextAreaElement>,
    @Optional() @Self() private readonly ngControl: NgControl
  ) {}

  ngOnInit(): void {
    this.el.nativeElement.addEventListener('input', this.handler, true);
  }

  ngOnDestroy(): void {
    this.el.nativeElement.removeEventListener('input', this.handler, true);
  }

  private processUppercase(_event: Event): void {
    const input = this.el.nativeElement;
    const upper = input.value.toUpperCase();
    if (input.value === upper) return;
    const pos = (input as HTMLInputElement).selectionStart ?? 0;
    input.value = upper;
    try { (input as HTMLInputElement).setSelectionRange(pos, pos); } catch { /* no es un input de texto */ }
    // Sincronizar con ReactiveForm / ngModel — el valor ya está en el DOM antes de que ellos lean
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(upper, { emitEvent: false });
    }
  }
}
