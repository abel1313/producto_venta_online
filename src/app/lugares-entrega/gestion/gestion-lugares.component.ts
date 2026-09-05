import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from 'src/app/auth/auth.service';
import { ILugarEntrega } from '../models/lugar-entrega.model';
import { LugarEntregaService } from '../service/lugar-entrega.service';

// Componente CRUD para el catálogo de lugares de entrega — solo accesible para admin.
// Con paginación real (tabla + controles de página) a diferencia del select que usan las
// demás pantallas (venta-directa, editar-entrega, filtro de pedidos), que piden todo de un
// jalón — ver nota en LugarEntregaService.getAll().
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

  // El CRUD genérico no devuelve total de registros — "hay siguiente página" se infiere:
  // si la página actual llegó completa (length === size), probablemente hay más.
  page = 0;
  readonly size = 10;
  haySiguiente = false;

  constructor(
    private readonly svc: LugarEntregaService,
    private readonly fb:  FormBuilder,
    private readonly authService: AuthService
  ) {}

  // Permisos finos (Fase 3, 2026-09-05, mismo patrón que palabras-clave): "Editar" cubre el
  // formulario de alta/edición completo (nombre, envío, horas extra, recoger en tienda, día de
  // entrega, centro de la zona) y el editor de anillos de cobro por distancia -- son un único
  // flujo de "editar la zona", no tiene sentido partirlos más fino. "Eliminar" es su propia
  // acción puntual -- ver migration_accion_lugares_entrega_eliminar.sql.
  get puedeEditar(): boolean {
    return this.authService.tieneEscritura('lugares-entrega');
  }

  get puedeEliminar(): boolean {
    return this.authService.tieneAccion('lugares-entrega', 'eliminar');
  }

  // Centro de la zona (para el mapa/picker) — no es parte del FormGroup porque
  // SelectorUbicacionComponent maneja lat/lng por [lat]/[lng]/(ubicacionCambio), no ngModel.
  centroLat: number | null = null;
  centroLng: number | null = null;

  // 1=lunes .. 7=domingo (java.time.DayOfWeek.getValue(), mismo valor que espera el back).
  readonly diasSemana = [
    { valor: 1, nombre: 'Lunes' },
    { valor: 2, nombre: 'Martes' },
    { valor: 3, nombre: 'Miércoles' },
    { valor: 4, nombre: 'Jueves' },
    { valor: 5, nombre: 'Viernes' },
    { valor: 6, nombre: 'Sábado' },
    { valor: 7, nombre: 'Domingo' },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      // Ambos solo los usa el módulo de flores eternas — el checkout normal de la tienda no lee
      // ninguno de los dos. Opcionales: vacío = sin costo de envío / sin tiempo extra.
      costoEnvio: [null],
      horasExtraAnticipacion: [null],
      // Marca cuál fila es "recoger en el local" (checkout tienda/carrito) — debe haber como
      // mucho una en true, no se valida aquí.
      esRecogerEnTienda: [false],
      // Día recurrente del viaje de entrega a esta zona (1=lunes..7=domingo) — "Entregas por
      // zona" lo usa para sugerir la fecha. Vacío = sin configurar.
      diaEntregaSemanal: [null]
    });
    this.cargar();
  }

  onCentroCambio(p: { lat: number; lng: number }): void {
    this.centroLat = p.lat;
    this.centroLng = p.lng;
  }

  cargar(): void {
    this.cargando = true;
    this.svc.getAll(this.page, this.size).subscribe({
      next: data => {
        this.lugares = data;
        this.haySiguiente = data.length === this.size;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'Error al cargar lugares', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo cargar la lista de lugares.', timer: 2000, showConfirmButton: false });
      }
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

  iniciarEdicion(l: ILugarEntrega): void {
    this.editandoId = l.id;
    this.centroLat = l.latitud ?? null;
    this.centroLng = l.longitud ?? null;
    this.form.patchValue({
      nombre: l.nombre,
      costoEnvio: l.costoEnvio ?? null,
      horasExtraAnticipacion: l.horasExtraAnticipacion ?? null,
      esRecogerEnTienda: l.esRecogerEnTienda ?? false,
      diaEntregaSemanal: l.diaEntregaSemanal ?? null
    });
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.centroLat = null;
    this.centroLng = null;
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const nombre = this.form.value.nombre.trim();

    const body = {
      nombre,
      costoEnvio: this.form.value.costoEnvio,
      horasExtraAnticipacion: this.form.value.horasExtraAnticipacion,
      latitud: this.centroLat,
      longitud: this.centroLng,
      esRecogerEnTienda: this.form.value.esRecogerEnTienda,
      diaEntregaSemanal: this.form.value.diaEntregaSemanal
    };

    const op$ = this.editandoId !== null
      ? this.svc.update(this.editandoId, body)
      : this.svc.save(body);

    op$.subscribe({
      next: () => {
        this.guardando = false;
        this.cancelarEdicion();
        // Recarga la página actual en vez de parchear el arreglo local — con paginación real,
        // un alta puede pertenecer a otra página y una edición no cambia el orden mostrado.
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
          // Si se elimina el último ítem de una página que no es la primera, retrocede una
          // página para no quedar viendo una tabla vacía.
          if (this.lugares.length === 1 && this.page > 0) this.page--;
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: (err?.error?.mensaje ?? err?.error?.message) ?? undefined })
      });
    });
  }

  get ctrl() { return this.form.get('nombre'); }
}
