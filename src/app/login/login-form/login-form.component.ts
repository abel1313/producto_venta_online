import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss']
})
export class LoginFormComponent implements OnInit {

   loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin() {
    const credentials = this.loginForm.value;
    this.http.post<any>('https://proyecto-key-1.onrender.com/mis-productos/auth/login', credentials).subscribe({
      next: (res) => {
        console.log(res)
        localStorage.setItem('token', res.token);
        this.authService.setRolesFromToken( res.token);
        this.router.navigate(['/productos']);
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
