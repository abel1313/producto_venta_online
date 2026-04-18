import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { AuthenticateService as auth } from 'src/app/auth.service';
import { AccederService } from '../acceder.service';
import Swal from 'sweetalert2';
import { ITokenData } from '../models/ITokenData.model';
import { IResponseGeneric } from 'src/shared/responseGeneric.model';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

  loginForm: FormGroup;
  errorMessage: string = '';

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
  }

  onLogin() {
    const credentials = this.loginForm.value;
    this.acceder.login(credentials).subscribe({
      next: (res: IResponseGeneric<ITokenData>) => {
        if (res != null && res.codigo == 200) {
          localStorage.setItem('token', res.response?.accessToken || '');
          this.authService.setRolesFromToken(res.response?.accessToken || '');
          this.router.navigate(['/productos']);
          this.auth.setAccessToken(res.response?.accessToken||'');
        } else {
          Swal.fire({
            title: "Usuario o contraseña incorrectas",
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
