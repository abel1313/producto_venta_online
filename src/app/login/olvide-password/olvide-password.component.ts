import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';

@Component({
  selector: 'app-olvide-password',
  templateUrl: './olvide-password.component.html',
  styleUrls: ['./olvide-password.component.scss']
})
export class OlvidePasswordComponent {
  paso: 'email' | 'codigo' = 'email';
  enviando = false;
  email = '';
  errorMsg = '';
  mostrarNueva = false;
  mostrarConfirmar = false;

  emailForm: FormGroup;
  codigoForm: FormGroup;

  constructor(
    private readonly fb:      FormBuilder,
    private readonly router:  Router,
    private readonly acceder: AccederService
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.codigoForm = this.fb.group({
      codigo:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      nuevaPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmarPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  private passwordsMatch(g: FormGroup) {
    return g.get('nuevaPassword')?.value === g.get('confirmarPassword')?.value
      ? null : { noCoincide: true };
  }

  enviarCodigo(): void {
    if (this.emailForm.invalid || this.enviando) return;
    this.enviando = true;
    this.email = this.emailForm.value.email;
    // El backend siempre responde 200 — avanzar pase lo que pase
    this.acceder.olvidoPassword(this.email).subscribe({
      next:  () => { this.enviando = false; this.paso = 'codigo'; },
      error: () => { this.enviando = false; this.paso = 'codigo'; }
    });
  }

  restablecerPassword(): void {
    if (this.codigoForm.invalid || this.enviando) return;
    this.enviando = true;
    this.errorMsg = '';
    const { codigo, nuevaPassword } = this.codigoForm.value;
    this.acceder.restablecerPassword(this.email, codigo, nuevaPassword).subscribe({
      next: () => {
        this.enviando = false;
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña actualizada!',
          text: 'Ya puedes iniciar sesión con tu nueva contraseña.',
          confirmButtonText: 'Ir al login'
        }).then(() => this.router.navigate(['/login']));
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = err?.error?.mensaje ?? err?.error?.message ?? 'Código inválido o expirado.';
      }
    });
  }
}
