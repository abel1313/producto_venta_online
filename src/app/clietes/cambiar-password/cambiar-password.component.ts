import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AccederService } from 'src/app/login/acceder.service';

@Component({
  selector: 'app-cambiar-password',
  templateUrl: './cambiar-password.component.html',
  styleUrls: ['./cambiar-password.component.scss']
})
export class CambiarPasswordComponent {
  form: FormGroup;
  guardando = false;
  errorMsg = '';
  mostrarActual = false;
  mostrarNueva = false;
  mostrarConfirmar = false;

  constructor(
    private readonly fb:      FormBuilder,
    private readonly acceder: AccederService
  ) {
    this.form = this.fb.group({
      passwordActual:    ['', Validators.required],
      nuevaPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmarPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  private passwordsMatch(g: FormGroup) {
    return g.get('nuevaPassword')?.value === g.get('confirmarPassword')?.value
      ? null : { noCoincide: true };
  }

  cambiar(): void {
    if (this.form.invalid || this.guardando) return;
    this.guardando = true;
    this.errorMsg = '';
    const { passwordActual, nuevaPassword } = this.form.value;
    this.acceder.cambiarPassword(passwordActual, nuevaPassword).subscribe({
      next: () => {
        this.guardando = false;
        this.form.reset();
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña actualizada!',
          text: 'Tu contraseña ha sido cambiada correctamente.'
        });
      },
      error: (err) => {
        this.guardando = false;
        this.errorMsg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cambiar la contraseña.';
      }
    });
  }
}
