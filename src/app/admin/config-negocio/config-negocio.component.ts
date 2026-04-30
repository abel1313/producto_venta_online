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
  cargando         = true;
  toggling         = false;
  guardandoHorario = false;
  guardandoContactos = false;

  horarioForm!:   FormGroup;
  contactosForm!: FormGroup;

  constructor(
    private readonly negocioService: NegocioService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.horarioForm = this.fb.group({
      horaApertura: ['09:00'],
      horaCierre:   ['21:00']
    });
    this.contactosForm = this.fb.group({
      whatsappUrl: [''],
      facebookUrl: ['']
    });
    this.cargarConfig();
  }

  private cargarConfig(): void {
    this.cargando = true;
    this.negocioService.getConfig().subscribe({
      next: (data: any) => {

        this.estado = data.data;
        this.horarioForm.patchValue({
          horaApertura: data.horaApertura ?? '09:00',
          horaCierre:   data.horaCierre   ?? '21:00'
        });
        this.contactosForm.patchValue({
          whatsappUrl: data.whatsappUrl ?? '',
          facebookUrl: data.facebookUrl ?? ''
        });
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  // ── Toggle instantáneo (sin confirmación) ─────────────────────────

  toggleNegocio(): void {
    if (!this.estado || this.toggling) return;
    this.toggling = true;
    const accion$ = this.estado.abierto
      ? this.negocioService.cerrar()
      : this.negocioService.abrir();

    accion$.subscribe({
      next: () => {
        this.estado!.abierto = !this.estado!.abierto;
        this.toggling = false;
      },
      error: () => {
        this.toggling = false;
        Swal.fire({ icon: 'error', title: 'Error al cambiar estado', timer: 1600, showConfirmButton: false });
      }
    });
  }

  // ── Guardar horario ────────────────────────────────────────────────

  guardarHorario(): void {
    this.guardandoHorario = true;
    this.negocioService.actualizarHorario(this.horarioForm.value).subscribe({
      next: () => {
        this.guardandoHorario = false;
        if (this.estado) {
          this.estado.horaApertura = this.horarioForm.value.horaApertura;
          this.estado.horaCierre   = this.horarioForm.value.horaCierre;
        }
        Swal.fire({ icon: 'success', title: '¡Horario actualizado!', timer: 1400, showConfirmButton: false });
      },
      error: () => {
        this.guardandoHorario = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar horario', timer: 1600, showConfirmButton: false });
      }
    });
  }

  // ── Guardar contactos (request existente) ─────────────────────────

  guardarContactos(): void {
    this.guardandoContactos = true;
    this.negocioService.actualizarContactos(this.contactosForm.value).subscribe({
      next: () => {
        this.guardandoContactos = false;
        if (this.estado) {
          this.estado.whatsappUrl = this.contactosForm.value.whatsappUrl;
          this.estado.facebookUrl = this.contactosForm.value.facebookUrl;
        }
        Swal.fire({ icon: 'success', title: '¡Contactos actualizados!', timer: 1400, showConfirmButton: false });
      },
      error: () => {
        this.guardandoContactos = false;
        Swal.fire({ icon: 'error', title: 'Error al guardar contactos', timer: 1600, showConfirmButton: false });
      }
    });
  }
}
