import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';
import { PresentacionService, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';
import { CarritoVarianteService } from 'src/app/variante/service/carrito-variante.service';
import { CarritoService } from 'src/app/services/carrito/carrito.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage    = '';
  mostrarPassword = false;
  cargando        = false;
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
    private readonly router:               Router,
    private readonly authService:          AuthService,
    private readonly auth:                 auth,
    private readonly acceder:              AccederService,
    private readonly presentacion:         PresentacionService,
    private readonly carritoVariante:      CarritoVarianteService,
    private readonly carritoService:       CarritoService
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.presentacion.getImagenesPorTipoV2('LOGIN').subscribe({
      next: (imgs: IImagenPresentacionV2Dto[]) => { this.imagenesV2 = imgs; },
      error: () => {}
    });
  }

  onLogin(): void {
    if (this.cargando) return;
    this.cargando = true;
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
        const debeCambiar: boolean = res?.debeCambiarPassword ?? false;
        if (token) {
          this.carritoVariante.limpiar();
          this.carritoService.limpiarCarrito();
          this.auth.setAccessToken(token);
          this.authService.setRolesFromToken(token);
          if (debeCambiar) {
            // cargando sigue en true hasta que se resuelva el Swal — evita que el usuario
            // reenvíe el formulario con otras credenciales mientras el cambio está pendiente.
            this.forzarCambioPassword(credentials.password ?? '');
          } else {
            this.cargando = false;
            this.router.navigate(['/productos/buscar']);
          }
        } else {
          this.cargando = false;
          Swal.fire({ title: 'Usuario o contraseña incorrectos', icon: 'error', showConfirmButton: false });
        }
        this.errorMessage = '';
      },
      error: (error: any) => {
        this.cargando = false;
        if (error.status === 403) {
          // Correo sin verificar — enviar código y redirigir a pantalla de verificación.
          // Pasamos el password en el state (en memoria, no persiste) para hacer auto-login
          // después de que el usuario verifique el código, sin que tenga que escribirlo de nuevo.
          const userName: string = credentials.userName ?? '';
          const password: string = credentials.password ?? '';
          this.acceder.enviarCodigoVerificacionUsuario(userName).subscribe({
            next:  () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: userName }, state: { codigoEnviado: true, password } }),
            error: () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: userName }, state: { codigoEnviado: true, password } })
          });
          return;
        }
        if (error.status === 429) {
          this.errorMessage = error.error ?? 'Demasiados intentos. Por favor, inténtalo de nuevo más tarde.';
          return;
        }
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    });
  }

  // Mismas reglas que passwordFuerte (src/app/validador/validador.ts), usadas en el registro —
  // el checklist visual del Swal debe validar exactamente lo mismo que el backend exige.
  private static readonly REGEX_ESPECIAL = /[!@#$%^&*()\-_=+\[\]{};:'",.<>?\/\\|`~]/;
  private cumpleRequisitos(valor: string): boolean {
    return valor.length >= 8
      && /[A-Z]/.test(valor)
      && /[a-z]/.test(valor)
      && /[0-9]/.test(valor)
      && LoginFormComponent.REGEX_ESPECIAL.test(valor);
  }

  private forzarCambioPassword(passwordActual: string): void {
    Swal.fire({
      title: '🔑 Cambia tu contraseña',
      html: `
        <p style="font-size:0.88rem;color:#64748b;margin-bottom:12px;text-align:left">
          Tu contraseña fue reseteada por un administrador.<br>
          Debes crear una nueva contraseña para continuar.
        </p>
        <input id="swal-pwd-nueva" type="password" class="swal2-input" placeholder="Nueva contraseña">
        <input id="swal-pwd-confirm" type="password" class="swal2-input" placeholder="Confirmar nueva contraseña">
        <style>
          .swal-pwd-reqs { margin-top: 10px; text-align: left; background: #fdf0f5; border: 1px solid #fad4e4; border-radius: 10px; padding: 12px 14px; }
          .swal-pwd-reqs__title { font-size: 0.7rem; font-weight: 700; color: #B08A4E; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
          .swal-req { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #dc2626; transition: color 0.2s; margin-bottom: 4px; }
          .swal-req__icon { color: #dc2626; transition: color 0.2s; flex-shrink: 0; }
          .swal-req.met { color: #374151; }
          .swal-req.met .swal-req__icon { color: #10b981; }
          .swal-pwd-bar { height: 4px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin-top: 8px; }
          .swal-pwd-bar__fill { height: 100%; width: 0%; border-radius: 99px; background: #ef4444; transition: width 0.3s ease, background-color 0.3s ease; }
        </style>
        <div class="swal-pwd-reqs">
          <p class="swal-pwd-reqs__title">Tu contraseña debe tener:</p>
          <div id="swal-req-longitud"  class="swal-req"><span class="swal-req__icon">○</span> Mínimo 8 caracteres</div>
          <div id="swal-req-mayuscula" class="swal-req"><span class="swal-req__icon">○</span> Una mayúscula (A, B, C…)</div>
          <div id="swal-req-minuscula" class="swal-req"><span class="swal-req__icon">○</span> Una minúscula (a, b, c…)</div>
          <div id="swal-req-numero"    class="swal-req"><span class="swal-req__icon">○</span> Un número (0–9)</div>
          <div id="swal-req-especial"  class="swal-req"><span class="swal-req__icon">○</span> Un carácter especial (! @ # $ % &amp; * - _ .)</div>
          <div class="swal-pwd-bar"><div id="swal-pwd-bar-fill" class="swal-pwd-bar__fill"></div></div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Cambiar y entrar',
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        const input = document.getElementById('swal-pwd-nueva') as HTMLInputElement | null;
        const actualizarChecklist = () => {
          const valor = input?.value ?? '';
          const reqs: Record<string, boolean> = {
            'swal-req-longitud':  valor.length >= 8,
            'swal-req-mayuscula': /[A-Z]/.test(valor),
            'swal-req-minuscula': /[a-z]/.test(valor),
            'swal-req-numero':    /[0-9]/.test(valor),
            'swal-req-especial':  LoginFormComponent.REGEX_ESPECIAL.test(valor),
          };
          let cumplidos = 0;
          Object.entries(reqs).forEach(([id, met]) => {
            if (met) cumplidos++;
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.toggle('met', met);
            const icon = el.querySelector('.swal-req__icon');
            if (icon) icon.textContent = met ? '✓' : '○';
          });
          const fill = document.getElementById('swal-pwd-bar-fill');
          if (fill) {
            fill.style.width = `${cumplidos * 20}%`;
            fill.style.background = cumplidos <= 2 ? '#ef4444' : cumplidos <= 4 ? '#f59e0b' : '#10b981';
          }
        };
        input?.addEventListener('input', actualizarChecklist);
      },
      preConfirm: async () => {
        const nueva   = (document.getElementById('swal-pwd-nueva')   as HTMLInputElement)?.value ?? '';
        const confirm = (document.getElementById('swal-pwd-confirm') as HTMLInputElement)?.value ?? '';
        if (!this.cumpleRequisitos(nueva)) {
          Swal.showValidationMessage('La contraseña no cumple todos los requisitos de arriba.');
          return false;
        }
        if (nueva !== confirm) {
          Swal.showValidationMessage('Las contraseñas no coinciden');
          return false;
        }
        try {
          await this.acceder.cambiarPassword(passwordActual, nueva).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Error al cambiar la contraseña.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      this.cargando = false;
      if (result.isConfirmed) this.router.navigate(['/productos/buscar']);
    });
  }
}
