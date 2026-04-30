import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';
import { PresentacionService, IImagenPresentacion } from 'src/app/presentacion/presentacion.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage  = '';
  mostrarPassword = false;

  imagenes: IImagenPresentacion[] = [];
  // fallback mientras carga o si falla el API
  private readonly FALLBACK = [
    './../../../assets/imagenes/imagene1.jpeg',
    './../../../assets/imagenes/imagen2.jpeg',
    './../../../assets/imagenes/imagene3.jpeg',
  ];

  imgSrc(orden: number): string {
    const img = this.imagenes.find(i => i.orden === orden && i.activo);
    return img?.urlImagen || this.FALLBACK[orden - 1];
  }

  imgDesc(orden: number): string {
    return this.imagenes.find(i => i.orden === orden)?.descripcion ?? '';
  }

  constructor(
    private readonly fb:            FormBuilder,
    private readonly router:        Router,
    private readonly authService:   AuthService,
    private readonly auth:          auth,
    private readonly acceder:       AccederService,
    private readonly presentacion:  PresentacionService
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: any) => {
        const token: string = res?.response?.accessToken ?? res?.accessToken ?? res?.token ?? '';
        if (token) {
          this.auth.setAccessToken(token);
          this.authService.setRolesFromToken(token);
          this.router.navigate(['/productos/buscar']);
        } else {
          Swal.fire({
            title: 'Usuario o contraseña incorrectas',
            icon: 'error',
            showConfirmButton: false
          });
        }
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    });
  }

  ngOnInit(): void {
    this.presentacion.getImagenesPorTipo('LOGIN').subscribe({
  
      
      next: (imgs: any) => { this.imagenes = imgs.data; 

          console.log("llego al entra al; login ",  imgs);
      },
      error: () => {
        console.error("fallos ");
        
      }   // usa fallback si falla
    });
  }

}
