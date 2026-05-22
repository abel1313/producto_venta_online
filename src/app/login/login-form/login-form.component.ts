import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';
import { PresentacionService, IImagenPresentacion, IImagenPresentacionV2Dto } from 'src/app/presentacion/presentacion.service';
import { ImagenVersionService } from 'src/app/services/imagen-version/imagen-version.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage    = '';
  mostrarPassword = false;
  imagenes: IImagenPresentacion[] = [];
  imagenesV2: IImagenPresentacionV2Dto[] = [];

  private readonly FALLBACK = [
    './../../../assets/imagenes/imagene1.jpeg',
    './../../../assets/imagenes/imagen2.jpeg',
    './../../../assets/imagenes/imagene3.jpeg',
  ];

  imgSrc(orden: number): string {
    if (this.imagenVersionService.useV2) {
      const img = this.imagenesV2.find(i => i.orden === orden && i.activo);
      if (img) return this.presentacion.getImagenUrlV2(img.id);
      return this.FALLBACK[orden - 1];
    }
    const img = this.imagenes.find(i => i.orden === orden && i.activo);
    if (img) return this.presentacion.getImagenUrl(img.id);
    return this.FALLBACK[orden - 1];
  }

  imgDesc(orden: number): string {
    return this.imagenes.find(i => i.orden === orden)?.descripcion ?? '';
  }

  constructor(
    private readonly fb:                   FormBuilder,
    private readonly router:               Router,
    private readonly authService:          AuthService,
    private readonly auth:                 auth,
    private readonly acceder:              AccederService,
    private readonly presentacion:         PresentacionService,
    private readonly imagenVersionService: ImagenVersionService
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.imagenVersionService.useV2) {
      this.presentacion.getImagenesPorTipoV2('LOGIN').subscribe({
        next: (imgs: IImagenPresentacionV2Dto[]) => { this.imagenesV2 = imgs; },
        error: () => {}
      });
    } else {
      this.presentacion.getImagenesPorTipo('LOGIN').subscribe({
        next: (res: any) => {
          // El back envuelve la lista en { data: [...] }
          this.imagenes = res?.data ?? res ?? [];
        },
        error: () => {} // usa fallback si falla
      });
    }
  }

  onLogin(): void {
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
        if (token) {
          this.auth.setAccessToken(token);
          this.authService.setRolesFromToken(token);
          this.router.navigate(['/productos/buscar']);
        } else {
          Swal.fire({ title: 'Usuario o contraseña incorrectos', icon: 'error', showConfirmButton: false });
        }
        this.errorMessage = '';
      },
      error: (error: any) => { 
        this.errorMessage = 'Usuario o contraseña incorrectos'; 
        if (error.status === 429) {
          this.errorMessage = error.error ?? 'Demasiados intentos. Por favor, inténtalo de nuevo más tarde.';
        }
        console.log("que ror trae ", error);
        
      }
    });
  }
}
