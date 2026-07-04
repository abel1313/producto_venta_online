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
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
        if (token) {
          this.carritoVariante.limpiar();
          this.carritoService.limpiarCarrito();
          this.auth.setAccessToken(token);
          this.authService.setRolesFromToken(token);
          this.router.navigate(['/productos/buscar']);
        } else {
          Swal.fire({ title: 'Usuario o contraseña incorrectos', icon: 'error', showConfirmButton: false });
        }
        this.errorMessage = '';
      },
      error: (error: any) => {
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
}
