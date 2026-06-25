import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { IPalabraClave } from '../models/palabra-clave.model';
import { PalabraClaveService } from '../service/palabra-clave.service';

// Componente CRUD para el catálogo de palabras clave — solo accesible para admin
@Component({
  selector: 'app-gestion-palabras-clave',
  templateUrl: './gestion-palabras-clave.component.html',
  styleUrls: ['./gestion-palabras-clave.component.scss']
})
export class GestionPalabrasClave implements OnInit {

  palabras: IPalabraClave[] = [];
  cargando  = false;
  guardando = false;

  // null = modo agregar, number = modo editar
  editandoId: number | null = null;

  form!: FormGroup;

  constructor(
    private readonly svc: PalabraClaveService,
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
      next: data => { this.palabras = data; this.cargando = false; },
      error: (err) => { this.cargando = false; Swal.fire({ icon: 'error', title: 'Error al cargar categorías', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de categorías.', timer: 2000, showConfirmButton: false }); }
    });
  }

  iniciarEdicion(p: IPalabraClave): void {
    this.editandoId = p.id;
    this.form.patchValue({ nombre: p.nombre });
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
      next: guardada => {
        this.guardando = false;
        if (this.editandoId !== null) {
          // Actualiza el item en la lista sin recargar todo
          const idx = this.palabras.findIndex(p => p.id === this.editandoId);
          if (idx !== -1) this.palabras[idx] = guardada;
        } else {
          this.palabras.push(guardada);
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

  eliminar(p: IPalabraClave): void {
    Swal.fire({
      title: `¿Eliminar "${p.nombre}"?`,
      text:  'Los productos/variantes que la usan quedarán sin categoría.',
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonText:  'Sí, eliminar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor:  '#6b7280'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.delete(p.id).subscribe({
        next: () => {
          this.palabras = this.palabras.filter(x => x.id !== p.id);
          Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1200, showConfirmButton: false });
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error al eliminar' })
      });
    });
  }

  get ctrl() { return this.form.get('nombre'); }
}
