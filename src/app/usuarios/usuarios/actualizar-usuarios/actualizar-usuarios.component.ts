import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from 'src/app/shared/usuario.service';
import { IUsuarioDto } from '../models/usuario.dto';

@Component({
  selector: 'app-actualizar-usuarios',
  templateUrl: './actualizar-usuarios.component.html',
  styleUrls: ['./actualizar-usuarios.component.scss']
})
export class ActualizarUsuariosComponent implements OnInit {

  usuUpdate: IUsuarioDto = {
    email: '',
    enabled: false,
    rol: '',
    username: ''
  };
  constructor(
    private readonly serviceUser: UsuarioService,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.serviceUser.userUpdate$.subscribe(data => {
      if (!data?.username) {
        this.router.navigate(['/usuarios/buscar']);
        return;
      }
      this.usuUpdate = data;
    });
  }

}
