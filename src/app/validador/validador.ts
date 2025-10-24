
import { AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordFuerte(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const tieneMayuscula = /[A-Z]/.test(valor);
  const tieneMinuscula = /[a-z]/.test(valor);
  const tieneNumero = /[0-9]/.test(valor);
  const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(valor);

  const valido = tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;

  return valido ? null : { passwordFuerte: true };
}

export function passwordsIguales(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

