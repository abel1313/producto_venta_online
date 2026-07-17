
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccederService } from 'src/app/login/acceder.service';
import { passwordFuerte, passwordsIguales } from 'src/app/validador/validador';
import Swal from 'sweetalert2';
import { IUsuarioDto } from '../models/usuario.dto';
import { AuthService } from 'src/app/auth/auth.service';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { PresentacionService, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';

@Component({
  selector: 'app-add-usuarios',
  templateUrl: './add-usuarios.component.html',
  styleUrls: ['./add-usuarios.component.scss']
})
export class AddUsuariosComponent implements OnInit, OnDestroy {
  @Input() textoCard: string = 'Registrar usuario';
  @Input() updateUser: IUsuarioDto = {
    email: '',
    enabled: false,
    rol: '',
    username: '',
  }
  emailOriginal        = '';
  codigoPendiente      = false;
  correoNuevoPendiente = '';
  cooldownReenvio      = 0;
  private cooldownTimer: any = null;
  imagenesV2: IImagenPresentacionV2Dto[] = [];
  private readonly FALLBACK = [
    './../../../assets/imagenes/imagene1.jpeg',
    './../../../assets/imagenes/imagen2.jpeg',
    './../../../assets/imagenes/imagene3.jpeg',
  ];
  imgSrc(orden: number): string {
    const img = this.imagenesV2.find(i => i.orden === orden && i.activo);
    if (img) return this.presentacion.getImagenUrlV2(img.id);
    return this.FALLBACK[orden - 1];
  }
  imgDesc(orden: number): string {
    return this.imagenesV2.find(i => i.orden === orden)?.descripcion ?? '';
  }

  constructor(
    private readonly fb:                   FormBuilder,
    public  readonly auth:                 AccederService,
    private readonly router:               Router,
    public  readonly authService:          AuthService,
    private readonly usuario:              UsuarioService,
    private readonly presentacion:         PresentacionService
  ) { }

  formRegistro = this.fb.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordFuerte]],
    confirmPassword: ['', Validators.required],
    enabled: true,
    rol: ''
  }, { validators: passwordsIguales });



  ngOnInit(): void {
    this.presentacion.getImagenesPorTipoV2('REGISTRO').subscribe({
      next: (imgs: IImagenPresentacionV2Dto[]) => { this.imagenesV2 = imgs; },
      error: () => {}
    });

    if (this.textoCard == 'Actualizar usuario') {
      this.emailOriginal = this.updateUser.email;
      this.formRegistro.patchValue({
        userName: this.updateUser.username,
        email: this.updateUser.email,
        enabled: this.updateUser.enabled,
        rol: this.updateUser.rol
      });

      this.formRegistro.get('password')?.clearValidators();
      this.formRegistro.get('confirmPassword')?.clearValidators();
      this.formRegistro.get('password')?.updateValueAndValidity({ emitEvent: false });
      this.formRegistro.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });

      this.formRegistro.get('password')?.valueChanges.subscribe(() => this.togglePasswordValidators());
      this.formRegistro.get('confirmPassword')?.valueChanges.subscribe(() => this.togglePasswordValidators());

      // Verificar si hay cambio de correo pendiente en el backend
      if (this.updateUser.id) {
        this.usuario.cambioCorreoPendienteAdmin(this.updateUser.id).subscribe({
          next: (res: any) => {
            const data = res?.data ?? res;
            if (data?.pendiente === true && data?.correoPendiente) {
              this.codigoPendiente      = true;
              this.correoNuevoPendiente = data.correoPendiente;
              // El campo se queda mostrando el correo ACTUAL (this.emailOriginal), no el
              // pendiente sin verificar — el banner de abajo es quien comunica a qué correo
              // va a cambiar. Evita que el campo "aparente" ya tener el correo nuevo guardado.
            }
          },
          error: () => { /* sin cambio pendiente — ignorar */ }
        });
      }
    }
  }

  private togglePasswordValidators() {
  const passwordControl = this.formRegistro.get('password');
  const confirmPasswordControl = this.formRegistro.get('confirmPassword');

  const passwordValue = passwordControl?.value;
  const confirmValue = confirmPasswordControl?.value;

  if (passwordValue || confirmValue) {
    // Si alguno tiene valor → aplicar validadores
    passwordControl?.setValidators([Validators.required, Validators.minLength(8), passwordFuerte]);
    confirmPasswordControl?.setValidators([Validators.required]);
  } else {
    // Si ambos están vacíos → quitar validadores
    passwordControl?.clearValidators();
    confirmPasswordControl?.clearValidators();
  }

  passwordControl?.updateValueAndValidity({ emitEvent: false });
  confirmPasswordControl?.updateValueAndValidity({ emitEvent: false });
}

  registrarUsuario() {
    if(this.textoCard == 'Actualizar usuario'){
      this.updateUserDto();
    }else{
      this.darAltaUser();
    }
  }


  darAltaUser(){
    if (this.formRegistro.valid) {
      const { userName, email, password } = this.formRegistro.value;
      const usrName: string = userName ?? '';
      this.auth.registrar({ userName: usrName, email, password }).subscribe({
        next: (registrado) => {
          if (registrado != null) {
            this.formRegistro.reset();
            // Enviar código de verificación automáticamente y redirigir
            const pwd: string = password ?? '';
            this.auth.enviarCodigoVerificacionUsuario(usrName).subscribe({
              next:  () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: usrName }, state: { codigoEnviado: true, password: pwd } }),
              error: () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: usrName }, state: { codigoEnviado: true, password: pwd } })
            });
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un error al registrarse.' });
          }
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'Ocurrió un error al registrarse.' });
        }
      });
    }
  }

  updateUserDto() {
    const { userName, email, password, enabled, rol } = this.formRegistro.value;


      this.updateUser.username = userName || '';
      this.updateUser.email = email || '',
      this.updateUser.enabled = enabled || false,
      this.updateUser.rol = rol || '',
      this.updateUser.password = password || '';

    this.usuario.restablecerContra(this.updateUser, this.updateUser.id || 0).subscribe(registrado => {
      if (registrado != null) {
        this.formRegistro.reset();
        Swal.fire({
          title: `Se restablecio la contrasena de ${userName}`,
          icon: "success",
          draggable: true
        }).then(() => this.router.navigate(['/login']));
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrio un error al registrarse"
        });
      }
    },
      errr => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrio un error al registrarse"
        });
      });
  }

  restablecerContra() {
    const { userName, email, password } = this.formRegistro.value;
    this.updateUser.password = `${userName}123`;
    this.usuario.restablecerContra(this.updateUser, this.updateUser.id || 0).subscribe(registrado => {
      if (registrado != null) {
        this.formRegistro.reset();
        Swal.fire({
          title: `Se restablecio la contrasena de ${userName}`,
          icon: "success",
          draggable: true
        }).then(() => this.router.navigate(['/login']));
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrio un error al registrarse"
        });
      }
    },
      errr => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ocurrio un error al registrarse"
        });
      });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }

  resetearPasswordAdmin(): void {
    if (!this.updateUser.id) return;
    Swal.fire({
      title: `¿Resetear contraseña de ${this.updateUser.username}?`,
      text: 'Se generará una contraseña temporal que deberás compartir con el usuario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.usuario.resetearPassword(this.updateUser.id!).subscribe({
        next: (res: any) => {
          const nuevaPass: string = res?.data ?? '—';
          Swal.fire({
            icon: 'success',
            title: 'Contraseña reseteada',
            html: `
              <p>La contraseña temporal de <strong>${this.updateUser.username}</strong> es:</p>
              <div style="font-size:1.7rem;font-weight:800;letter-spacing:5px;
                          padding:12px 16px;background:rgba(0,0,0,0.06);
                          border-radius:10px;margin:10px 0;font-family:monospace">
                ${nuevaPass}
              </div>
              <p style="font-size:0.82rem;color:#64748b">
                Dásela al usuario. Deberá cambiarla en su siguiente inicio de sesión.
              </p>
            `,
            confirmButtonText: 'Entendido'
          });
        },
        error: (err: any) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo resetear la contraseña.' });
        }
      });
    });
  }

  verificarCorreoAdmin(): void {
    this.auth.enviarCodigoVerificacionUsuario(this.updateUser.username).subscribe({
      next:  () => this.mostrarSwalCodigoAdmin(),
      error: () => this.mostrarSwalCodigoAdmin()
    });
  }

  private mostrarSwalCodigoAdmin(): void {
    Swal.fire({
      title: `Verificar correo — ${this.updateUser.username}`,
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código al correo de <strong>${this.updateUser.username}</strong>.<br>
          Pídele que te dicte el código de 6 dígitos.
        </p>
        <input id="swal-codigo-admin" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #007AFF;border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-admin') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.auth.verificarCorreoUsuario(this.updateUser.username, codigo).toPromise();
          return true;
        } catch (err: any) {
          const raw = err?.error;
          const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) return;
      Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: `El correo de ${this.updateUser.username} fue verificado correctamente.` });
    });
  }

  onEmailBlur(): void {
    if (!this.updateUser.id || !this.authService.isAdminService || this.textoCard !== 'Actualizar usuario') return;
    const nuevoEmail = this.formRegistro.get('email')?.value ?? '';
    if (!nuevoEmail || nuevoEmail === this.emailOriginal) return;
    const id = this.updateUser.id;
    this.usuario.solicitarCambioCorreoAdmin(id, nuevoEmail).subscribe({
      next: () => {
        this.codigoPendiente      = true;
        this.correoNuevoPendiente = nuevoEmail;
        // El campo vuelve a mostrar el correo actual — el nuevo (sin verificar) solo se
        // comunica vía el banner de "código pendiente", no como valor del campo.
        this.formRegistro.get('email')?.setValue(this.emailOriginal);
        this.iniciarCooldown();
        this.mostrarSwalCambioCorreo(nuevoEmail, id);
      },
      error: (err: any) => {
        const raw = err?.error;
        const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'No se pudo enviar el código de verificación.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  reingresarCodigoCambioCorreo(): void {
    this.mostrarSwalCambioCorreo(this.correoNuevoPendiente, this.updateUser.id!);
  }

  cancelarCambioCorreo(): void {
    this.formRegistro.get('email')?.setValue(this.emailOriginal);
    this.codigoPendiente      = false;
    this.correoNuevoPendiente = '';
    this.cooldownReenvio      = 0;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  reenviarCodigoCambioCorreo(): void {
    if (this.cooldownReenvio > 0 || !this.updateUser.id) return;
    this.usuario.solicitarCambioCorreoAdmin(this.updateUser.id, this.correoNuevoPendiente).subscribe({
      next: () => {
        this.iniciarCooldown();
        Swal.fire({ icon: 'success', title: 'Código reenviado', text: `Se envió un nuevo código a ${this.correoNuevoPendiente}`, timer: 2500, showConfirmButton: false });
      },
      error: (err: any) => {
        const raw = err?.error;
        const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'No se pudo reenviar el código.';
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

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  private mostrarSwalCambioCorreo(correoNuevo: string, id: number): void {
    Swal.fire({
      title: `Verificar nuevo correo — ${this.updateUser.username}`,
      html: `
        <p style="margin-bottom:10px;font-size:0.88rem">
          Se envió un código a <strong>${correoNuevo}</strong>.<br>
          Pídele al usuario que te dicte los 6 dígitos.
        </p>
        <input id="swal-codigo-cambio" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:150px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid #007AFF;border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar y guardar',
      showCancelButton: true,
      cancelButtonText: 'Verificar después',
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-cambio') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.usuario.confirmarCambioCorreoAdmin(id, codigo).toPromise();
          return true;
        } catch (err: any) {
          const raw = err?.error;
          const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) return;
      this.emailOriginal            = correoNuevo;
      this.updateUser.email         = correoNuevo;
      this.formRegistro.get('email')?.setValue(correoNuevo);
      this.codigoPendiente          = false;
      this.correoNuevoPendiente     = '';
      this.cooldownReenvio          = 0;
      Swal.fire({ icon: 'success', title: '¡Correo actualizado!', text: `El correo de ${this.updateUser.username} fue cambiado y verificado.`, timer: 2500, showConfirmButton: false });
    });
  }

  guardarPermisos(): void {
    const { enabled, rol } = this.formRegistro.value;
    const body = { ...this.updateUser, enabled: enabled ?? false, rol: rol ?? '' };
    this.usuario.restablecerContra(body, body.id || 0).subscribe({
      next: () => {
        this.updateUser.enabled = body.enabled;
        this.updateUser.rol     = body.rol;
        Swal.fire({ icon: 'success', title: 'Permisos guardados', text: `Estado y rol de ${this.updateUser.username} actualizados.`, timer: 2000, showConfirmButton: false });
      },
      error: (err: any) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo guardar.' });
      }
    });
  }

  showPassword        = false;
  showConfirmPassword = false;

  get pwd(): string { return this.formRegistro.get('password')?.value || ''; }
  get reqMayuscula(): boolean { return /[A-Z]/.test(this.pwd); }
  get reqMinuscula(): boolean { return /[a-z]/.test(this.pwd); }
  get reqNumero(): boolean { return /[0-9]/.test(this.pwd); }
  get reqEspecial(): boolean { return /[!@#$%^&*()\-_=+\[\]{};:'",.<>?\/\\|`~]/.test(this.pwd); }
  get reqLongitud(): boolean { return this.pwd.length >= 8; }
  get pwdStrength(): number {
    return [this.reqLongitud, this.reqMayuscula, this.reqMinuscula, this.reqNumero, this.reqEspecial].filter(r => r).length;
  }
  get pwdStrengthLevel(): string {
    if (this.pwdStrength <= 2) return 'weak';
    if (this.pwdStrength === 3) return 'medium';
    return 'strong';
  }
}
