import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
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

  // El CRUD genérico no devuelve total de registros — "hay siguiente página" se infiere:
  // si la página actual llegó completa (length === size), probablemente hay más. Mismo
  // patrón que gestion-lugares.component.ts (mismo endpoint genérico).
  page = 0;
  readonly size = 10;
  haySiguiente = false;

  constructor(
    private readonly svc: PalabraClaveService,
    private readonly fb:  FormBuilder,
    private readonly authService: AuthService
  ) {}

  // Reemplaza el gate implícito de "si llegaste aquí eres admin" -- Fase 3 de permisos
  // (2026-09-05, mismo patrón que Modelos/Tienda). "Editar" usa tieneEscritura (permiso
  // general de la pantalla), "Eliminar" es su propia acción puntual -- ver
  // migration_accion_palabras_clave_eliminar.sql.
  get puedeEditar(): boolean {
    return this.authService.tieneEscritura('palabras-clave');
  }

  get puedeEliminar(): boolean {
    return this.authService.tieneAccion('palabras-clave', 'eliminar');
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]]
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getAll(this.page, this.size).subscribe({
      next: data => {
        this.palabras = data;
        this.haySiguiente = data.length === this.size;
        this.cargando = false;
      },
      error: (err) => { this.cargando = false; Swal.fire({ icon: 'error', title: 'Error al cargar categorías', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de categorías.', timer: 2000, showConfirmButton: false }); }
    });
  }

  paginaAnterior(): void {
    if (this.page === 0) return;
    this.page--;
    this.cargar();
  }

  siguientePagina(): void {
    if (!this.haySiguiente) return;
    this.page++;
    this.cargar();
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
      next: () => {
        this.guardando = false;
        this.cancelarEdicion();
        // Recarga la página actual en vez de parchear el arreglo local — con paginación
        // real, un alta puede pertenecer a otra página y una edición no cambia el orden.
        this.cargar();
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
          // Si se elimina el último ítem de una página que no es la primera, retrocede
          // una página para no quedar viendo una tabla vacía.
          if (this.palabras.length === 1 && this.page > 0) this.page--;
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1200, showConfirmButton: false });
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error al eliminar' })
      });
    });
  }

  get ctrl() { return this.form.get('nombre'); }
}
