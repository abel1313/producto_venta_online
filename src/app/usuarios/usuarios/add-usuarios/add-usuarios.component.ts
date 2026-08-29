
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AccederService } from 'src/app/login/acceder.service';
import { passwordFuerte, passwordsIguales } from 'src/app/validador/validador';
import Swal from 'sweetalert2';
import { IUsuarioDto } from '../models/usuario.dto';
import { AuthService } from 'src/app/auth/auth.service';
import { UsuarioService, IExcepcionSubmenu } from 'src/app/shared/usuario.service';
import { SesionService } from 'src/app/shared/sesion.service';
import { PresentacionService, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';
import { MenuAdminService } from 'src/app/menu-admin/service/menu.service';
import { IMenu, ISubmenu } from 'src/app/menu-admin/models/menu.model';

interface GrupoSubmenusExcepcion {
  menu: IMenu | null;
  submenus: ISubmenu[];
}

type EstadoExcepcion = 'ninguno' | 'suma' | 'quita';

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
  roles: { id: number; nombreRol: string }[] = [];

  // ── Excepciones de pantalla individuales (encima del rol) ──────────────────────────────
  gruposExcepciones: GrupoSubmenusExcepcion[] = [];
  excepciones: IExcepcionSubmenu[] = [];
  cargandoExcepciones = false;
  guardandoExcepcionSubmenuId: number | null = null;
  grupoExcepcionAbierto: number | 'sin-grupo' | null = null;
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
    private readonly presentacion:         PresentacionService,
    private readonly sesion:               SesionService,
    private readonly menuAdmin:            MenuAdminService
  ) { }

  formRegistro = this.fb.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordFuerte]],
    confirmPassword: ['', Validators.required],
    enabled: true,
    rol: '',
    rolId: [null as number | null]
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

      // El selector de rol necesita el catálogo real de roles -- una vez cargado, se
      // preselecciona el que coincide con el nombre que ya trae updateUser.rol (el back solo
      // expone el nombre, no el id, en el listado de usuarios).
      this.usuario.getRoles().subscribe({
        next: roles => {
          this.roles = roles;
          const actual = roles.find(r => r.nombreRol === this.updateUser.rol);
          if (actual) this.formRegistro.patchValue({ rolId: actual.id });
        },
        error: () => {}
      });

      if (this.updateUser.id) this.cargarExcepciones(this.updateUser.id);

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

  /**
   * Resetea la contraseña de un usuario y muestra la temporal para que el admin se la pase.
   *
   * ⚠️ **Caso propio:** si el admin se resetea a sí mismo, el back invalida su token **al
   * instante** (refuerzo 2026-08-16 — antes le quedaban 15 minutos de gracia), así que su
   * siguiente clic caería en un 401 y lo sacaría al login sin entender por qué. Aquí se le avisa
   * antes y se le cierra la sesión a propósito después de enseñarle la contraseña temporal.
   */
  resetearPasswordAdmin(): void {
    if (!this.updateUser.id) return;
    const esMiPropiaCuenta = this.updateUser.id === this.authService.userIdValue;
    Swal.fire({
      title: `¿Resetear contraseña de ${this.updateUser.username}?`,
      text: esMiPropiaCuenta
        ? 'Es tu propia cuenta: se cerrará tu sesión y tendrás que entrar de nuevo con la contraseña temporal.'
        : 'Se generará una contraseña temporal que deberás compartir con el usuario.',
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
                ${esMiPropiaCuenta
                  ? 'Anótala: la vas a necesitar para volver a entrar, y te la va a pedir cambiar.'
                  : 'Dásela al usuario. Deberá cambiarla en su siguiente inicio de sesión.'}
              </p>
            `,
            confirmButtonText: 'Entendido'
          }).then(() => {
            // La sesión ya está muerta del lado del back; se cierra aquí de forma controlada en
            // vez de dejar que el admin choque con un 401 en su siguiente clic.
            if (esMiPropiaCuenta) this.sesion.cerrarSesionLocal();
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
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
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
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;
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

  // El campo enabled se guarda vía updateUsuario (ya funcionaba). El rol se guarda aparte, con
  // el endpoint real PUT /{usuarioId}/rol/{rolId} -- antes este botón mandaba "rol" como texto
  // suelto a updateUsuario, que ni siquiera lee ese campo, así que nunca cambiaba nada.
  guardarPermisos(): void {
    const { enabled, rolId } = this.formRegistro.value;
    const id = this.updateUser.id || 0;
    const body = { ...this.updateUser, enabled: enabled ?? false };

    this.usuario.restablecerContra(body, id).subscribe({
      next: () => {
        this.updateUser.enabled = body.enabled;
        if (!rolId) {
          Swal.fire({ icon: 'success', title: 'Estado guardado', timer: 1600, showConfirmButton: false });
          return;
        }
        this.usuario.cambiarRol(id, rolId).subscribe({
          next: (res: any) => {
            this.updateUser.rol = res?.rol ?? this.roles.find(r => r.id === rolId)?.nombreRol ?? this.updateUser.rol;
            Swal.fire({ icon: 'success', title: 'Permisos guardados', text: `Estado y rol de ${this.updateUser.username} actualizados.`, timer: 2000, showConfirmButton: false });
          },
          error: (err: any) => {
            Swal.fire({ icon: 'error', title: 'Se guardó el estado, pero no el rol', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo cambiar el rol.' });
          }
        });
      },
      error: (err: any) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo guardar.' });
      }
    });
  }

  showPassword        = false;
  showConfirmPassword = false;

  // Este componente se reusa para "Registrar" (autoservicio, público) y "Actualizar usuario"
  // (admin, editando a otro) -- el botón Volver homologado necesita distinguir a dónde cae de
  // respaldo si no hay una pantalla anterior real en el historial.
  get esActualizar(): boolean { return this.textoCard === 'Actualizar usuario'; }

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

  // ── Excepciones de pantalla individuales (PLAN_PERMISOS_PANTALLAS.md sección 3) ────────
  // Encima de lo que ya da el rol del usuario: "suma" = le da una pantalla que su rol NO tiene;
  // "quita" = le quita una que su rol SÍ tiene. Solo para ESTE usuario, sin tocar el rol.

  private cargarExcepciones(usuarioId: number): void {
    this.cargandoExcepciones = true;
    this.menuAdmin.getMenus().subscribe(menus => {
      this.menuAdmin.getSubmenus().subscribe(submenus => {
        const ordenados = [...menus].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        const grupos: GrupoSubmenusExcepcion[] = ordenados.map(menu => ({
          menu,
          submenus: submenus
            .filter(s => s.menu?.id === menu.id)
            .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
        }));
        const sinGrupo = submenus
          .filter(s => !s.menu)
          .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        if (sinGrupo.length > 0) grupos.push({ menu: null, submenus: sinGrupo });
        this.gruposExcepciones = grupos;

        this.usuario.listarExcepcionesSubmenu(usuarioId).subscribe({
          next: excepciones => { this.excepciones = excepciones; this.cargandoExcepciones = false; },
          error: () => { this.cargandoExcepciones = false; }
        });
      });
    });
  }

  toggleGrupoExcepcion(g: GrupoSubmenusExcepcion): void {
    const clave = g.menu ? g.menu.id : 'sin-grupo';
    this.grupoExcepcionAbierto = this.grupoExcepcionAbierto === clave ? null : clave;
  }

  grupoExcepcionEstaAbierto(g: GrupoSubmenusExcepcion): boolean {
    return this.grupoExcepcionAbierto === (g.menu ? g.menu.id : 'sin-grupo');
  }

  contarExcepcionesGrupo(g: GrupoSubmenusExcepcion): number {
    const idsConExcepcion = new Set(this.excepciones.map(e => e.submenu.id));
    return g.submenus.filter(s => idsConExcepcion.has(s.id)).length;
  }

  estadoExcepcion(submenu: ISubmenu): EstadoExcepcion {
    const e = this.excepciones.find(ex => ex.submenu.id === submenu.id);
    if (!e) return 'ninguno';
    return e.concedido ? 'suma' : 'quita';
  }

  // Clic = ciclo de 3 estados: sin excepción -> "+ dar acceso" -> "- quitar acceso" -> sin excepción.
  ciclarExcepcion(submenu: ISubmenu): void {
    if (!this.updateUser.id) return;
    const usuarioId = this.updateUser.id;
    const estado = this.estadoExcepcion(submenu);
    this.guardandoExcepcionSubmenuId = submenu.id;

    const op$: Observable<unknown> = estado === 'ninguno'
      ? this.usuario.agregarExcepcionSubmenu(usuarioId, submenu.id, true)
      : estado === 'suma'
        ? this.usuario.agregarExcepcionSubmenu(usuarioId, submenu.id, false)
        : this.usuario.quitarExcepcionSubmenu(usuarioId, submenu.id);

    op$.subscribe({
      next: () => {
        this.guardandoExcepcionSubmenuId = null;
        this.cargarExcepciones(usuarioId);
      },
      error: (err: any) => {
        this.guardandoExcepcionSubmenuId = null;
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.mensaje ?? err?.error?.message ?? 'No se pudo actualizar la excepción.' });
      }
    });
  }
}
