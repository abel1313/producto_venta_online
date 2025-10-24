
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { AccederService } from 'src/app/login/acceder.service';
import { passwordFuerte, passwordsIguales } from 'src/app/validador/validador';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-usuarios',
  templateUrl: './add-usuarios.component.html',
  styleUrls: ['./add-usuarios.component.scss']
})
export class AddUsuariosComponent implements OnInit {

  constructor(private readonly fb: FormBuilder,
    private readonly auth: AccederService,
    private readonly router: Router
  ) { }

  formRegistro = this.fb.group({
    userName: ['', Validators.required],
    email: ['', [Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordFuerte]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsIguales });



  ngOnInit(): void {
  }

  registrarUsuario() {
    console.log(this.formRegistro.valid)
    if (this.formRegistro.valid) {
      const {userName, email, password} = this.formRegistro.value;
      console.log('Registrando usuario:', {userName, email, password});
      this.auth.registrar({userName, email, password}).subscribe(registrado => {
        if (registrado != null) {
          Swal.fire({
            title: registrado.userName,
            icon: "success",
            draggable: true
          });
          this.formRegistro.reset();
          this.router.navigate(['/login']);
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
      // Aquí puedes llamar a tu servicio para guardar el usuario
    }
  }

  irAlLogin(){
    this.router.navigate(['/login']);
  }
}
