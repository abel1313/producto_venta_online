import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Reglas para los datos de una persona que se guardan (Venta directa, QA 2026-10-08): lo opcional se
// puede dejar vacío, pero si se escribe tiene que cumplir. Son las mismas que valida el back en
// ClienteSinRegistroImpl.validar(), para que el aviso salga antes de mandar el formulario.

export const MIN_LETRAS_NOMBRE = 3;

/** Cuántas letras tiene el texto (cuenta acentos y ñ; no cuenta espacios, puntos ni números). */
export function contarLetras(texto: string | null | undefined): number {
  return (texto ?? '').match(/\p{L}/gu)?.length ?? 0;
}

/** Vacío es válido; si se escribió algo, necesita al menos `minimo` letras. */
export function cumpleMinLetras(texto: string | null | undefined, minimo = MIN_LETRAS_NOMBRE): boolean {
  const t = (texto ?? '').trim();
  return t === '' || contarLetras(t) >= minimo;
}

export function minLetras(minimo = MIN_LETRAS_NOMBRE): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    cumpleMinLetras(control.value, minimo) ? null : { minLetras: { requeridas: minimo } };
}

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function correoOpcional(control: AbstractControl): ValidationErrors | null {
  const t = (control.value ?? '').trim();
  return t === '' || CORREO.test(t) ? null : { correo: true };
}

/** 10 dígitos (se aceptan espacios, guiones, paréntesis y +52 adelante). */
export function telefonoOpcional(control: AbstractControl): ValidationErrors | null {
  const digitos = (control.value ?? '').replace(/[\s()+-]/g, '');
  if (digitos === '') return null;
  const valido = /^\d{10}$/.test(digitos) || /^52\d{10}$/.test(digitos);
  return valido ? null : { telefono: true };
}
