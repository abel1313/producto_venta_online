import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { pedirCambioPasswordForzado } from '../cambio-password-forzado';
import { AccederService } from '../acceder.service';
import { PresentacionService, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';
import { CarritoVarianteService } from 'src/app/variante/service/carrito-variante.service';
import { CarritoService } from 'src/app/services/carrito/carrito.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { SesionService } from 'src/app/shared/sesion.service';
import { NegocioService, IContactosPublicos } from 'src/app/negocio/negocio.service';
import { horaLegible } from 'src/app/shared/hora.util';

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

  // ── Estado del negocio (abierto/cerrado + horario) y redes sociales ──
  // Ambos endpoints son públicos (sin token) — fallan en silencio si no cargan,
  // son puro adorno informativo y no deben bloquear el login.
  negocioAbierto: boolean | null = null;
  private horaApertura: string | null = null;
  private horaCierre:   string | null = null;
  contactos: IContactosPublicos | null = null;

  get estadoNegocioTexto(): string {
    if (this.negocioAbierto === null) return '';
    // Con la hora legible ("6:00 p.m."), no cruda: "abrimos a las 18:00" obliga a traducir
    // mentalmente, y "a las 6" sin el a.m./p.m. es directamente ambiguo.
    if (this.negocioAbierto) {
      const cierra = horaLegible(this.horaCierre);
      return cierra ? `¡Local abierto! Puedes comprar hasta las ${cierra}` : 'Local abierto';
    }
    const abre = horaLegible(this.horaApertura);
    return abre ? `Local cerrado — abrimos a las ${abre}` : 'Local cerrado por ahora';
  }

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
    if (img) return this.presentacion.getImagenUrlV2(img);
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
    private readonly sesion:               SesionService,
    private readonly negocioService:       NegocioService
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

    // GET /v1/negocio/estado — mismo shape envuelto { data: {...} } que ya
    // consume ChatbotComponent. horaApertura/horaCierre pueden venir null si
    // el admin nunca configuró horario (contrato confirmado por el back).
    this.negocioService.getEstado().subscribe({
      next: (res: any) => {
        const estado = res?.data ?? res;
        this.negocioAbierto = estado?.abierto ?? null;
        this.horaApertura   = estado?.horaApertura ?? null;
        this.horaCierre     = estado?.horaCierre   ?? null;
      },
      error: () => {}
    });

    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.contactos = c; },
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
          // ⚠️ `codigoEnviado: true` solo va en el `next` -- si el envío falla (red, rate limit,
          // etc.) NO hay que decirle a la pantalla de verificación que ya existe un código
          // válido: eso la dejaba sin reintentar y sin avisar nada, con el usuario tecleando
          // contra un código que nunca llegó a existir. Sin el flag, verificar-correo reintenta
          // el envío solo al cargar y sí muestra el error real (ej. "Demasiados intentos").
          const userName: string = credentials.userName ?? '';
          const password: string = credentials.password ?? '';
          this.acceder.enviarCodigoVerificacionUsuario(userName).subscribe({
            next:  () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: userName }, state: { codigoEnviado: true, password } }),
            error: () => this.router.navigate(['/login/verificar-correo'], { queryParams: { u: userName }, state: { password } })
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

  private forzarCambioPassword(passwordActual: string): void {
    pedirCambioPasswordForzado(nueva => this.acceder.cambiarPassword(passwordActual, nueva).toPromise().then(() => undefined))
      .then(confirmado => {
        this.cargando = false;
        if (!confirmado) return;
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
