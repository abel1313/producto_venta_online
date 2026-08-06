import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AccederService } from 'src/app/login/acceder.service';
import { SesionService } from 'src/app/shared/sesion.service';

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
    private readonly acceder: AccederService,
    private readonly sesion:  SesionService
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
        // El back invalida el refresh token al cambiar la contraseña (seguridad 2026-07-31):
        // quedarse aquí dejaría al usuario con una sesión muerta que falla al primer refresh.
        this.sesion.cerrarSesionLocal();
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña actualizada!',
          text: 'Vuelve a iniciar sesión con tu nueva contraseña.'
        });
      },
      error: (err) => {
        this.guardando = false;
        this.errorMsg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cambiar la contraseña.';
      }
    });
  }
}
