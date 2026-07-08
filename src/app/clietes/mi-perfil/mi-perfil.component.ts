import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { AccederService } from 'src/app/login/acceder.service';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from '../cliente.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  usernameCtrl   = new FormControl('', Validators.required);
  emailCtrl      = new FormControl('', [Validators.email]);
  passActualCtrl = new FormControl('');
  passNuevaCtrl  = new FormControl('');
  passConfCtrl   = new FormControl('');

  emailOriginal   = '';
  guardandoPerfil = false;
  guardandoPass   = false;
  errorPerfil     = '';

  showActual  = false;
  showNueva   = false;
  showConfirm = false;

  constructor(
    private readonly acceder:        AccederService,
    private readonly authService:    AuthService,
    private readonly clienteService: ClienteService
  ) {}

  ngOnInit(): void {
    this.authService.userName$.pipe(take(1)).subscribe(name => {
      this.usernameCtrl.setValue(name || '');
    });
    this.authService.userId$.pipe(take(1)).subscribe(userId => {
      if (!userId) return;
      this.clienteService.getDataOneCliente(userId).subscribe({
        next: (data: any) => {
          const correo = data?.data?.correoElectronico ?? '';
          if (correo) {
            this.emailOriginal = correo;
            this.emailCtrl.setValue(correo);
          }
        },
        error: () => {}
      });
    });
  }

  // Getters de requisitos de contraseña
  get pwd(): string           { return this.passNuevaCtrl.value || ''; }
  get reqLongitud(): boolean  { return this.pwd.length >= 8; }
  get reqMayuscula(): boolean { return /[A-Z]/.test(this.pwd); }
  get reqMinuscula(): boolean { return /[a-z]/.test(this.pwd); }
  get reqNumero(): boolean    { return /[0-9]/.test(this.pwd); }
  get reqEspecial(): boolean  { return /[!@#$%^&*()\-_=+\[\]{};:'",.<>?\/\\|`~]/.test(this.pwd); }
  get pwdStrength(): number {
    return [this.reqLongitud, this.reqMayuscula, this.reqMinuscula, this.reqNumero, this.reqEspecial].filter(r => r).length;
  }
  get pwdStrengthLevel(): string {
    if (this.pwdStrength <= 2) return 'weak';
    if (this.pwdStrength === 3) return 'medium';
    return 'strong';
  }
  get passwordsNoCoinciden(): boolean {
    const n = this.passNuevaCtrl.value;
    const c = this.passConfCtrl.value;
    return !!(n && c && n !== c);
  }

  guardarPerfil(): void {
    const username = this.usernameCtrl.value?.trim() || '';
    const email    = this.emailCtrl.value?.trim()    || '';
    if (!username) return;

    const emailCambia = email && email !== this.emailOriginal;

    if (emailCambia) {
      this.flujoEmailChange(username, email);
    } else {
      this.ejecutarGuardarPerfil(username, this.emailOriginal);
    }
  }

  private ejecutarGuardarPerfil(username: string, email: string): void {
    this.guardandoPerfil = true;
    this.errorPerfil     = '';
    this.acceder.miPerfil(username, email).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        this.emailOriginal   = email;
        Swal.fire({ icon: 'success', title: '¡Perfil actualizado!', text: 'Tus datos fueron guardados.', timer: 2000, showConfirmButton: false });
      },
      error: (err: any) => {
        this.guardandoPerfil = false;
        this.errorPerfil = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar el perfil.';
      }
    });
  }

  private flujoEmailChange(username: string, nuevoEmail: string): void {
    this.guardandoPerfil = true;
    this.errorPerfil     = '';
    this.acceder.miPerfil(username, nuevoEmail).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        this.acceder.enviarCodigoVerificacionUsuario(username).subscribe({
          next:  () => this.mostrarSwalCodigo(username, nuevoEmail),
          error: () => this.mostrarSwalCodigo(username, nuevoEmail)
        });
      },
      error: (err: any) => {
        this.guardandoPerfil = false;
        this.errorPerfil     = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar el correo.';
        this.emailCtrl.setValue(this.emailOriginal);
      }
    });
  }

  private mostrarSwalCodigo(username: string, nuevoEmail: string): void {
    Swal.fire({
      title: 'Verifica tu nuevo correo',
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${nuevoEmail}</strong>.<br>
          Ingresa los 6 dígitos que recibiste.
        </p>
        <input id="swal-mp-codigo" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #B08A4E;border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Verificar más tarde',
      confirmButtonColor: '#B08A4E',
      preConfirm: () => {
        const codigo = (document.getElementById('swal-mp-codigo') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) { Swal.showValidationMessage('Ingresa los 6 dígitos'); return false; }
        return codigo;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        this.emailOriginal = nuevoEmail;
        Swal.fire({ icon: 'info', title: 'Correo guardado', text: 'Tu correo fue actualizado. Verifícalo cuando puedas.', timer: 2500, showConfirmButton: false });
        return;
      }
      this.acceder.verificarCorreoUsuario(username, result.value as string).subscribe({
        next: () => {
          this.emailOriginal = nuevoEmail;
          Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: 'Tu correo fue actualizado y verificado.', timer: 2500, showConfirmButton: false });
        },
        error: (err: any) => {
          this.emailCtrl.setValue(this.emailOriginal);
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
          Swal.fire({ icon: 'error', title: 'Código inválido', text: msg });
        }
      });
    });
  }

  cambiarPassword(): void {
    const actual    = this.passActualCtrl.value?.trim() || '';
    const nueva     = this.passNuevaCtrl.value?.trim()  || '';
    const confirmar = this.passConfCtrl.value?.trim()   || '';
    if (!actual || !nueva || nueva !== confirmar) return;
    if (!this.reqLongitud || !this.reqMayuscula || !this.reqMinuscula || !this.reqNumero || !this.reqEspecial) return;

    this.guardandoPass = true;
    this.acceder.cambiarPassword(actual, nueva).subscribe({
      next: () => {
        this.guardandoPass = false;
        this.passActualCtrl.setValue('');
        this.passNuevaCtrl.setValue('');
        this.passConfCtrl.setValue('');
        Swal.fire({ icon: 'success', title: '¡Contraseña cambiada!', text: 'Tu contraseña fue actualizada.', timer: 2000, showConfirmButton: false });
      },
      error: (err: any) => {
        this.guardandoPass = false;
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cambiar la contraseña.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }
}
