import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AuthService } from 'src/app/auth/auth.service';
import Swal from 'sweetalert2';
import { AccederService } from '../acceder.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage: string = '';
  mostrarPassword = false;

  imagenIcon1 = './../../../assets/imagenes/imagene1.jpeg';
  imagenIcon2 = './../../../assets/imagenes/imagen2.jpeg';
  imagenIcon3 = './../../../assets/imagenes/imagene3.jpeg';

  constructor(private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private readonly auth: auth,
    private readonly acceder: AccederService
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });

    console.log("******************************************************************************************************************** ");
    console.log("LoginFormComponent: Constructor ejecutado");
    console.log("******************************************************************************************************************** ");
    
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
  }

}
