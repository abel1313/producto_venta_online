import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { ProductoService } from 'src/app/productos/service/producto.service';
import Swal from 'sweetalert2';
import { ICliente } from '../models';
import { Constants } from 'src/app/Constants';

@Component({
  selector: 'app-clientes-add',
  templateUrl: './clientes-add.component.html',
  styleUrls: ['./clientes-add.component.scss']
})
export class ClientesAddComponent implements OnInit {

  @Input() nombreCard: string = '';
  @Output() $hideComponent = new EventEmitter<boolean>();

  formCliente: FormGroup;
  private idUsuario = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ProductoService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    if (this.nombreCard == '') {
      this.nombreCard = 'Nuevo cliente';
    }

    this.formCliente = this.fb.group({
      nombrePersona: ['', [Validators.required]],
      segundoNombre: [''],
      apeidoPaterno: ['', Validators.required],
      apeidoMaterno: ['', Validators.required],
      sexo: [''],
      correoElectronico: [''],
      numeroTelefonico: ['']
    });
  }

  ngOnInit(): void {
    this.authService.userId$.subscribe(id => { this.idUsuario = id; });
  }

  guardar(): void {
    if (this.formCliente.invalid) return;

    const cliente: ICliente = {
      ...this.formCliente.value,
      ...(this.idUsuario ? { usuario: { id: this.idUsuario } } : {})
    };

    this.service.saveCliente(cliente).subscribe({
      next: (res) => {
        this.formCliente.reset();
        sessionStorage.setItem(Constants.DATA_CLIENTE, JSON.stringify(res.data));
        this.$hideComponent.emit(true);
        Swal.fire({ title: 'Cliente registrado correctamente', icon: 'success' }).then(() => {
          if (this.idUsuario) this.router.navigate(['/variantes/buscar']);
        });
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar el cliente.' });
      }
    });
  }

  update(): void {}
}
