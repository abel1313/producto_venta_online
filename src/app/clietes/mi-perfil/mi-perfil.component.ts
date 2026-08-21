import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';
import { AccederService } from 'src/app/login/acceder.service';
import { AuthService } from 'src/app/auth/auth.service';
import { ClienteService } from '../cliente.service';
import { SesionService } from 'src/app/shared/sesion.service';
import { UsuarioService } from 'src/app/shared/usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit, OnDestroy {
  usernameCtrl   = new FormControl('', Validators.required);
  emailCtrl      = new FormControl('', [Validators.email]);
  passActualCtrl = new FormControl('');
  passNuevaCtrl  = new FormControl('');
  passConfCtrl   = new FormControl('');

  emailOriginal        = '';
  codigoPendiente      = false;
  correoNuevoPendiente = '';
  guardandoPerfil      = false;
  guardandoPass        = false;
  errorPerfil          = '';

  // Reenviar código
  cooldownReenvio  = 0;
  reenviadoCodigo  = false;
  private cooldownTimer: any = null;

  showActual  = false;
  showNueva   = false;
  showConfirm = false;

  constructor(
    private readonly acceder:        AccederService,
    private readonly authService:    AuthService,
    private readonly clienteService: ClienteService,
    private readonly sesion:         SesionService,
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.authService.userName$.pipe(take(1)).subscribe(name => {
      this.usernameCtrl.setValue(name || '');
    });
    this.authService.userId$.pipe(take(1)).subscribe(userId => {
      if (!userId) return;
      // ⚠️ `buscarPorIdCliente` espera el id de **cliente**, no el de usuario — confirmado por el
      // back (2026-08-16) revisando su código. Antes se le mandaba el `userId` y respondía
      // "No autorizado", así que el campo de correo se quedaba vacío. Hay que traducir primero.
      this.usuarioService.buscarClientePorIdUsuario(userId).subscribe({
        next: (clienteId: any) => {
          if (!clienteId) { this.verificarCambioCorreoPendiente(); return; }
          this.cargarCorreoCliente(clienteId);
        },
        error: () => { this.verificarCambioCorreoPendiente(); }
      });
    });
  }

  private cargarCorreoCliente(clienteId: number): void {
      this.clienteService.getDataOneCliente(clienteId).subscribe({
        next: (data: any) => {
          const correo = data?.data?.correoElectronico ?? '';
          if (correo) {
            this.emailOriginal = correo;
            this.emailCtrl.setValue(correo);
          }
          this.verificarCambioCorreoPendiente();
        },
        error: () => { this.verificarCambioCorreoPendiente(); }
      });
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  private verificarCambioCorreoPendiente(): void {
    this.acceder.cambioCorreoPendiente().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        if (data?.pendiente === true && data?.correoPendiente) {
          this.codigoPendiente      = true;
          this.correoNuevoPendiente = data.correoPendiente;
          this.emailCtrl.setValue(data.correoPendiente);
        }
      },
      error: () => { /* sin cambio pendiente — ignorar error */ }
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
      this.flujoEmailChange(email);
    } else {
      this.ejecutarGuardarPerfil(username);
    }
  }

  private ejecutarGuardarPerfil(username: string): void {
    this.guardandoPerfil = true;
    this.errorPerfil     = '';
    this.acceder.miPerfil(username).subscribe({
      next: () => {
        this.guardandoPerfil = false;
        Swal.fire({ icon: 'success', title: '¡Perfil actualizado!', text: 'Tus datos fueron guardados.', timer: 2000, showConfirmButton: false });
      },
      error: (err: any) => {
        this.guardandoPerfil = false;
        this.errorPerfil = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar el perfil.';
      }
    });
  }

  private flujoEmailChange(nuevoEmail: string): void {
    this.guardandoPerfil = true;
    this.errorPerfil     = '';
    this.acceder.solicitarCambioCorreo(nuevoEmail).subscribe({
      next: () => {
        this.guardandoPerfil       = false;
        this.codigoPendiente       = true;
        this.correoNuevoPendiente  = nuevoEmail;
        this.iniciarCooldown();
        this.mostrarSwalCodigo(nuevoEmail);
      },
      error: (err: any) => {
        this.guardandoPerfil = false;
        this.errorPerfil     = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo enviar el código.';
        this.emailCtrl.setValue(this.emailOriginal);
      }
    });
  }

  private mostrarSwalCodigo(nuevoEmail: string): void {
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
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Verificar más tarde',
      confirmButtonColor: 'var(--brand-1)',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-mp-codigo') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) { Swal.showValidationMessage('Ingresa los 6 dígitos'); return false; }
        try {
          await this.acceder.confirmarCambioCorreo(codigo).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (result.isConfirmed) {
        this.emailOriginal        = nuevoEmail;
        this.codigoPendiente      = false;
        this.correoNuevoPendiente = '';
        this.reenviadoCodigo      = false;
        this.cooldownReenvio      = 0;
        Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: 'Tu correo fue actualizado y verificado.', timer: 2500, showConfirmButton: false });
      }
    });
  }

  reingresarCodigo(): void {
    this.mostrarSwalCodigo(this.correoNuevoPendiente);
  }

  cancelarVerificacion(): void {
    this.codigoPendiente      = false;
    this.correoNuevoPendiente = '';
    this.reenviadoCodigo      = false;
    this.cooldownReenvio      = 0;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.emailCtrl.setValue(this.emailOriginal);
  }

  reenviarCodigo(): void {
    if (this.cooldownReenvio > 0) return;
    this.acceder.solicitarCambioCorreo(this.correoNuevoPendiente).subscribe({
      next: () => {
        this.reenviadoCodigo = true;
        this.iniciarCooldown();
        Swal.fire({ icon: 'success', title: 'Código reenviado', text: `Se envió un nuevo código a ${this.correoNuevoPendiente}`, timer: 2500, showConfirmButton: false });
      },
      error: (err: any) => {
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo reenviar el código.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  private iniciarCooldown(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownReenvio = 60;
    this.cooldownTimer = setInterval(() => {
      this.cooldownReenvio--;
      if (this.cooldownReenvio <= 0) {
        this.cooldownReenvio = 0;
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
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
        // El back invalida el refresh token al cambiar la contraseña (seguridad 2026-07-31).
        this.sesion.cerrarSesionLocal();
        Swal.fire({ icon: 'success', title: '¡Contraseña cambiada!', text: 'Vuelve a iniciar sesión con tu nueva contraseña.' });
      },
      error: (err: any) => {
        this.guardandoPass = false;
        const msg = err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cambiar la contraseña.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }
}
