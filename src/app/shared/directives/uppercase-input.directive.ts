import { Directive, HostListener, ElementRef, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({ selector: 'input[appUppercase], textarea[appUppercase]' })
export class UppercaseInputDirective {

  constructor(
    private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>,
    @Optional() @Self() private ngControl: NgControl
  ) {}

  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    const pos   = (input as HTMLInputElement).selectionStart ?? 0;
    const upper = input.value.toUpperCase();
    input.value = upper;
    // Mantener la posición del cursor
    try { (input as HTMLInputElement).setSelectionRange(pos, pos); } catch {}
    // Sincronizar con ngModel / ReactiveForm
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(upper, { emitEvent: false });
    }
  }
}
