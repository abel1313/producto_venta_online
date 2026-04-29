import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { NegocioService, INegocioEstado } from 'src/app/negocio/negocio.service';

@Component({
  selector: 'app-config-negocio',
  templateUrl: './config-negocio.component.html',
  styleUrls: ['./config-negocio.component.scss']
})
export class ConfigNegocioComponent implements OnInit {

  estado: INegocioEstado | null = null;
  cargando    = true;
  guardando   = false;

  form!: FormGroup;

  constructor(
    private readonly negocioService: NegocioService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      whatsappUrl: [''],
      facebookUrl: ['']
    });
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando = true;
    this.negocioService.getConfig().subscribe({
      next: (data: INegocioEstado) => {
        this.estado = data;
        this.form.patchValue({
          whatsappUrl: data.whatsappUrl ?? '',
          facebookUrl: data.facebookUrl ?? ''
        });
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  toggleNegocio(): void {
    if (!this.estado) return;
    const accion$ = this.estado.abierto
      ? this.negocioService.cerrar()
      : this.negocioService.abrir();

    const label = this.estado.abierto ? 'cerrar' : 'abrir';

    Swal.fire({
      title: `¿Deseas ${label} el negocio?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${label}`,
      cancelButtonText: 'Cancelar',
      background: '#1e1b4b',
      color: '#fff'
    }).then(r => {
      if (!r.isConfirmed) return;
      accion$.subscribe({
        next: () => {
          this.estado!.abierto = !this.estado!.abierto;
          Swal.fire({ icon: 'success', title: `Negocio ${this.estado!.abierto ? 'abierto' : 'cerrado'}`, timer: 1400, showConfirmButton: false });
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', timer: 1600, showConfirmButton: false })
      });
    });
  }

  guardarContactos(): void {
    this.guardando = true;
    this.negocioService.actualizarContactos(this.form.value).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: '¡Contactos actualizados!', timer: 1500, showConfirmButton: false });
        if (this.estado) {
          this.estado.whatsappUrl = this.form.value.whatsappUrl;
          this.estado.facebookUrl = this.form.value.facebookUrl;
        }
      },
      error: () => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
