
import { Component, Input, OnInit } from '@angular/core';
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
export class AddUsuariosComponent implements OnInit {
  @Input() textoCard: string = 'Registrar usuario';
  @Input() updateUser: IUsuarioDto = {
    email: '',
    enabled: false,
    rol: '',
    username: '',
  }
  emailOriginal            = '';
  // Panel inline cambio de correo
  mostrarFormCambioCorreo  = false;
  nuevoCorreoAdmin         = '';
  codigoEnviado            = false;
  codigoAdmin              = '';
  enviandoCodigo           = false;
  verificandoCodigo        = false;
  errorCambioCorreo        = '';
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

    this.formRegistro.get('password')?.valueChanges.subscribe(value => {
      this.togglePasswordValidators();
    });
    this.formRegistro.get('confirmPassword')?.valueChanges.subscribe(value => {
      this.togglePasswordValidators();
    });
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
                      padding:8px 12px;border:2px solid #B08A4E;border-radius:8px;
                      outline:none;font-family:monospace">
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const codigo = (document.getElementById('swal-codigo-admin') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        return codigo;
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      this.auth.verificarCorreoUsuario(this.updateUser.username, result.value as string).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: '¡Correo verificado!', text: `El correo de ${this.updateUser.username} fue verificado correctamente.` });
        },
        error: (err: any) => {
          const raw = err?.error;
          const msg = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
          Swal.fire({ icon: 'error', title: 'Código inválido', text: msg });
        }
      });
    });
  }

  abrirFormCambioCorreo(): void {
    this.mostrarFormCambioCorreo = true;
    this.nuevoCorreoAdmin        = '';
    this.codigoEnviado           = false;
    this.codigoAdmin             = '';
    this.errorCambioCorreo       = '';
  }

  cerrarFormCambioCorreo(): void {
    this.mostrarFormCambioCorreo = false;
  }

  enviarCodigoCambioCorreo(): void {
    if (!this.nuevoCorreoAdmin) return;
    const id = this.updateUser.id || 0;
    this.enviandoCodigo    = true;
    this.errorCambioCorreo = '';
    this.usuario.solicitarCambioCorreoAdmin(id, this.nuevoCorreoAdmin).subscribe({
      next: () => {
        this.enviandoCodigo = false;
        this.codigoEnviado  = true;
      },
      error: (err: any) => {
        this.enviandoCodigo = false;
        const raw = err?.error;
        this.errorCambioCorreo = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'No se pudo enviar el código.';
      }
    });
  }

  verificarCambioCorreo(): void {
    if (this.codigoAdmin.length !== 6) return;
    const id = this.updateUser.id || 0;
    this.verificandoCodigo = true;
    this.errorCambioCorreo = '';
    this.usuario.confirmarCambioCorreoAdmin(id, this.codigoAdmin).subscribe({
      next: () => {
        this.verificandoCodigo       = false;
        this.emailOriginal            = this.nuevoCorreoAdmin;
        this.updateUser.email         = this.nuevoCorreoAdmin;
        this.formRegistro.get('email')?.setValue(this.nuevoCorreoAdmin);
        this.mostrarFormCambioCorreo = false;
        Swal.fire({ icon: 'success', title: '¡Correo actualizado!', text: `El correo de ${this.updateUser.username} fue cambiado y verificado.`, timer: 2500, showConfirmButton: false });
      },
      error: (err: any) => {
        this.verificandoCodigo = false;
        const raw = err?.error;
        this.errorCambioCorreo = (typeof raw === 'string' ? raw : raw?.mensaje ?? raw?.message) ?? 'Código incorrecto o expirado.';
      }
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
