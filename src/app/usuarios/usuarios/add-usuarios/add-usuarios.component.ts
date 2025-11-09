
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccederService } from 'src/app/login/acceder.service';
import { passwordFuerte, passwordsIguales } from 'src/app/validador/validador';
import Swal from 'sweetalert2';
import { IUsuarioDto } from '../models/usuario.dto';
import { AuthService } from 'src/app/auth/auth.service';
import { UsuarioService } from 'src/app/shared/usuario.service';

@Component({
  selector: 'app-add-usuarios',
  templateUrl: './add-usuarios.component.html',
  styleUrls: ['./add-usuarios.component.scss']
})
export class AddUsuariosComponent implements OnInit {
  @Input() textoCard: string = 'Registrar usuario';
  @Input() updateUser: IUsuarioDto = {
    email: '',
    enabled: false,
    rol: '',
    username: '',
  }

  constructor(private readonly fb: FormBuilder,
    public readonly auth: AccederService,
    private readonly router: Router,
    public authService: AuthService,
    private readonly usuario: UsuarioService
  ) { }

  formRegistro = this.fb.group({
    userName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordFuerte]],
    confirmPassword: ['', Validators.required],
    enabled: true,
    rol: ''
  }, { validators: passwordsIguales });



  ngOnInit(): void {
    if (this.textoCard == 'Actualizar usuario') {
      this.formRegistro.patchValue({
        userName: this.updateUser.username,
        email: this.updateUser.email,
        enabled: this.updateUser.enabled,
        rol: this.updateUser.rol
      });

this.formRegistro.get('password')?.clearValidators();
this.formRegistro.get('confirmPassword')?.clearValidators();

this.formRegistro.get('password')?.updateValueAndValidity({ emitEvent: false });
this.formRegistro.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });

    this.formRegistro.get('password')?.valueChanges.subscribe(value => {
      this.togglePasswordValidators();
    });
    this.formRegistro.get('confirmPassword')?.valueChanges.subscribe(value => {
      this.togglePasswordValidators();
    });
    }
  }

  private togglePasswordValidators() {
  const passwordControl = this.formRegistro.get('password');
  const confirmPasswordControl = this.formRegistro.get('confirmPassword');

  const passwordValue = passwordControl?.value;
  const confirmValue = confirmPasswordControl?.value;

  if (passwordValue || confirmValue) {
    // Si alguno tiene valor → aplicar validadores
    passwordControl?.setValidators([Validators.required, Validators.minLength(8), passwordFuerte]);
    confirmPasswordControl?.setValidators([Validators.required]);
  } else {
    // Si ambos están vacíos → quitar validadores
    passwordControl?.clearValidators();
    confirmPasswordControl?.clearValidators();
  }

  passwordControl?.updateValueAndValidity({ emitEvent: false });
  confirmPasswordControl?.updateValueAndValidity({ emitEvent: false });
}

  registrarUsuario() {
    if(this.textoCard == 'Actualizar usuario'){
      this.updateUserDto();
    }else{
      this.darAltaUser();
    }
  }


  darAltaUser(){
    if (this.formRegistro.valid) {
      const { userName, email, password } = this.formRegistro.value;
      this.auth.registrar({ userName, email, password }).subscribe(registrado => {
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
    }
  }

  updateUserDto() {
    const { userName, email, password, enabled, rol } = this.formRegistro.value;


      this.updateUser.username = userName || '';
      this.updateUser.email = email || '',
      this.updateUser.enabled = enabled || false,
      this.updateUser.rol = rol || '',
      this.updateUser.password = password || '';

    this.usuario.restablecerContra(this.updateUser, this.updateUser.id || 0).subscribe(registrado => {
      if (registrado != null) {
        Swal.fire({
          title: `Se restablecio la contrasena de ${userName}`,
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
  }

  restablecerContra() {
    const { userName, email, password } = this.formRegistro.value;
    this.updateUser.password = `${userName}123`;
    this.usuario.restablecerContra(this.updateUser, this.updateUser.id || 0).subscribe(registrado => {
      if (registrado != null) {
        Swal.fire({
          title: `Se restablecio la contrasena de ${userName}`,
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
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}
