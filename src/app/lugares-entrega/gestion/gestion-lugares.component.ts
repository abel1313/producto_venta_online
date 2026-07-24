import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ILugarEntrega } from '../models/lugar-entrega.model';
import { LugarEntregaService } from '../service/lugar-entrega.service';

// Componente CRUD para el catálogo de lugares de entrega — solo accesible para admin
@Component({
  selector: 'app-gestion-lugares',
  templateUrl: './gestion-lugares.component.html',
  styleUrls: ['./gestion-lugares.component.scss']
})
export class GestionLugaresComponent implements OnInit {

  lugares: ILugarEntrega[] = [];
  cargando  = false;
  guardando = false;

  // null = modo agregar, number = modo editar
  editandoId: number | null = null;

  form!: FormGroup;

  constructor(
    private readonly svc: LugarEntregaService,
    private readonly fb:  FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]]
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getAll().subscribe({
      next: data => { this.lugares = data; this.cargando = false; },
      error: (err) => { this.cargando = false; Swal.fire({ icon: 'error', title: 'Error al cargar lugares', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de lugares.', timer: 2000, showConfirmButton: false }); }
    });
  }

  iniciarEdicion(l: ILugarEntrega): void {
    this.editandoId = l.id;
    this.form.patchValue({ nombre: l.nombre });
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const nombre = this.form.value.nombre.trim();

    const op$ = this.editandoId !== null
      ? this.svc.update(this.editandoId, { nombre })
      : this.svc.save({ nombre });

    op$.subscribe({
      next: guardado => {
        this.guardando = false;
        if (this.editandoId !== null) {
          const idx = this.lugares.findIndex(l => l.id === this.editandoId);
          if (idx !== -1) this.lugares[idx] = guardado;
        } else {
          this.lugares.push(guardado);
        }
        this.cancelarEdicion();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        this.guardando = false;
        const msg = err?.error?.mensaje ?? 'Error al guardar';
        Swal.fire({ icon: 'error', title: msg });
      }
    });
  }

  eliminar(l: ILugarEntrega): void {
    Swal.fire({
      title: `¿Eliminar "${l.nombre}"?`,
      text:  'Los pedidos que ya lo tengan asignado conservan el nombre, solo deja de estar disponible para nuevos pedidos.',
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonText:  'Sí, eliminar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor:  '#6b7280'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.delete(l.id).subscribe({
        next: () => {
          this.lugares = this.lugares.filter(x => x.id !== l.id);
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: (err?.error?.mensaje ?? err?.error?.message) ?? undefined })
      });
    });
  }

  get ctrl() { return this.form.get('nombre'); }
}
