import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';
import { PresentacionService, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';
import { CarritoVarianteService } from 'src/app/variante/service/carrito-variante.service';
import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { SesionService } from 'src/app/shared/sesion.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit, AfterViewInit, OnDestroy {

  loginForm: FormGroup;
  errorMessage    = '';
  mostrarPassword = false;
  cargando        = false;
  imagenesV2: IImagenPresentacionV2Dto[] = [];

  // ── Fondo animado (malla técnica WebGL) — solo modo oscuro ──
  @ViewChild('particlesCanvas') particlesCanvas?: ElementRef<HTMLCanvasElement>;
  isDark$ = this.themeService.isDark$;
  private animId: number | null = null;
  private resizeHandler?: () => void;
  private themeSub?: Subscription;
  private gl: WebGLRenderingContext | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uResLoc: WebGLUniformLocation | null = null;

  private static readonly MESH_VERTEX_SRC = `
    attribute vec2 pos;
    varying vec2 v_texCoord;
    void main() {
      v_texCoord = pos * 0.5 + 0.5;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `;

  // Malla técnica azul — segunda versión del shader (la que el usuario confirmó
  // como "el código exacto"). A diferencia de la primera, no usa ningún arreglo
  // indexado (vec2 p[9]) — cada línea se calcula "al vuelo" dentro del propio
  // loop de la celda vecina, por eso compila sin cambios en WebGL1/GLSL ES 1.00
  // (se revisó a propósito antes de integrarla, tras el bug de la primera versión).
  private static readonly MESH_FRAGMENT_SRC = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = v_texCoord;
      float scale = 8.0;
      vec2 grid_uv = uv * scale;
      vec2 id = floor(grid_uv);
      vec2 gv = fract(grid_uv) - 0.5;

      float m = 0.0;
      for (float y = -1.0; y <= 1.0; y++) {
        for (float x = -1.0; x <= 1.0; x++) {
          vec2 offs = vec2(x, y);
          vec2 p_id = id + offs;
          vec2 p1 = offs + sin(u_time * 0.5 + hash(p_id) * 6.28) * 0.4;
          vec2 p2 = vec2(0.0) + sin(u_time * 0.5 + hash(id) * 6.28) * 0.4;
          vec2 pa = gv - p1;
          vec2 ba = p2 - p1;
          float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          float distLine = length(pa - ba * h);
          m += smoothstep(0.02, 0.0, distLine) * 0.5 * (1.0 - h);
        }
      }

      vec3 color = vec3(0.0, 0.47, 1.0) * m;
      color += vec3(0.0, 0.1, 0.2) * (1.0 - length(uv - 0.5));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

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
    private readonly carritoService:       CarritoService,
    private readonly themeService:         ThemeService,
    private readonly sesion:               SesionService
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

  ngAfterViewInit(): void {
    this.themeSub = this.themeService.isDark$.subscribe(dark => {
      if (dark) {
        // esperar el tick del *ngIf para que el <canvas> ya exista en el DOM
        setTimeout(() => this.iniciarParticulas());
      } else {
        this.detenerParticulas();
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerParticulas();
    this.themeSub?.unsubscribe();
  }

  private iniciarParticulas(): void {
    const canvas = this.particlesCanvas?.nativeElement;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return; // sin soporte WebGL — se queda sin fondo animado, no rompe el login
    this.gl = gl;

    const compilar = (type: number, src: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[login-bg] error compilando shader:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const program = gl.createProgram();
    if (!program) return;
    const vs = compilar(gl.VERTEX_SHADER, LoginFormComponent.MESH_VERTEX_SRC);
    const fs = compilar(gl.FRAGMENT_SHADER, LoginFormComponent.MESH_FRAGMENT_SRC);
    if (!vs || !fs) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[login-bg] error enlazando el programa WebGL:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
    this.uResLoc  = gl.getUniformLocation(program, 'u_resolution');

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    this.resizeHandler = resize;
    window.addEventListener('resize', this.resizeHandler);

    const render = (t: number) => {
      if (!this.gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(this.uTimeLoc, t * 0.001);
      gl.uniform2f(this.uResLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  private detenerParticulas(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    this.gl = null;
  }

  onLogin(): void {
    if (this.cargando) return;
    this.cargando = true;
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
        // El back confirmó (2026-08-05) que `AuthResponse` solo expone `debeCambiarPassword`.
        // `passwordTemporal` es el campo interno de la entidad Usuario y nunca viaja al front.
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
          .swal-pwd-reqs { margin-top: 10px; text-align: left; background: #EFF5FF; border: 1px solid #C7DDFF; border-radius: 10px; padding: 12px 14px; }
          .swal-pwd-reqs__title { font-size: 0.7rem; font-weight: 700; color: #007AFF; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; }
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
      if (!result.isConfirmed) return;
      // Cambiar la contraseña invalida el refresh token en el instante (seguridad del back,
      // 2026-07-31). Entrar a la app aquí dejaría al usuario con una sesión ya muerta: el
      // siguiente refresh responde 401. Hay que volver a iniciar sesión con la nueva.
      this.sesion.cerrarSesionLocal();
      Swal.fire({
        icon: 'success',
        title: '¡Contraseña actualizada!',
        text: 'Vuelve a iniciar sesión con tu nueva contraseña.'
      });
    });
  }
}
