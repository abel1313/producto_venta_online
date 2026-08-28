import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ITemaVariable } from '../models/tema.model';
import { TemaAdminService } from '../service/tema-admin.service';

// Pantalla única de Personalización -- catálogo dinámico (ver TemaVariable en el backend): cada
// fila ES una variable CSS, el dueño puede agregar/editar/eliminar sin que nadie toque código.
// Mismo patrón "form arriba + lista abajo, editar carga el form" que Gestión de roles
// (menu-admin/gestion-roles), agrupado por `grupo` en secciones colapsables (arranca solo la
// primera sección abierta, igual que el diseño anterior de columnas fijas).
//
// Cada cambio en el form dispara preview en vivo (mismo mecanismo que antes: setProperty sobre
// <body>, ver TemaService) combinando el catálogo ya cargado con lo que hay en el form ahora
// mismo -- así se ve el cambio antes de guardar, sin esperar al POST/PUT.
@Component({
  selector: 'app-gestion-personalizacion',
  templateUrl: './gestion-personalizacion.component.html',
  styleUrls: ['./gestion-personalizacion.component.scss']
})
export class GestionPersonalizacionComponent implements OnInit {

  variables: ITemaVariable[] = [];
  grupos: string[] = [];
  cargando = true;
  guardando = false;
  editandoId: number | null = null;
  form!: FormGroup;

  readonly tipos: Array<ITemaVariable['tipo']> = ['color', 'numero', 'seleccion'];
  readonly sombras = ['suave', 'media', 'fuerte'];

  // Secciones abiertas por defecto: solo la primera -- el resto empieza colapsado para que la
  // pantalla no abrume apenas se entra.
  gruposAbiertos = new Set<string>();

  // Grupo que se muestra en el panel de vista previa (3ra columna) -- se actualiza al abrir una
  // sección o al editar/crear una variable de ese grupo, así el mockup de la derecha siempre
  // corresponde a lo que se está mirando/editando a la izquierda. Pedido del usuario 2026-08-28:
  // antes, para ver si un color "quedaba bien" en una Card o un Menú, había que guardar, salir de
  // Personalización y navegar a una pantalla real que la usara -- mucha ida y vuelta. Ahora el
  // mockup vive en la misma pantalla y reacciona en vivo (mismo mecanismo de siempre:
  // TemaService.previsualizar() ya pone las variables CSS en <body>, y estos mockups las leen con
  // los mismos var(--clave) que usa el resto de la app -- no hace falta re-render de Angular).
  grupoActivo: string | null = null;

  /** Normaliza el nombre del grupo (minúsculas, sin acentos) para el switch del preview -- así
   * "Página"/"pagina"/"PÁGINA" caen en el mismo caso sin depender de mayúsculas/acentos exactos. */
  get grupoPreview(): string {
    return (this.grupoActivo ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly svc: TemaAdminService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      clave: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(/^[a-z0-9-]+$/)]],
      etiqueta: ['', [Validators.required, Validators.maxLength(80)]],
      grupo: ['', [Validators.maxLength(40)]],
      tipo: ['color', Validators.required],
      valorClaro: ['', Validators.required],
      valorOscuro: [''],
      orden: [null]
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.listar().subscribe({
      next: data => {
        this.variables = [...data].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        this.grupos = [...new Set(this.variables.map(v => v.grupo || 'Otros'))];
        if (this.gruposAbiertos.size === 0 && this.grupos.length > 0) {
          this.gruposAbiertos.add(this.grupos[0]);
          this.grupoActivo = this.grupos[0];
        }
        this.cargando = false;
        this.svc.previsualizar(this.variables);
      },
      error: () => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo cargar la personalización' });
      }
    });
  }

  porGrupo(g: string): ITemaVariable[] {
    return this.variables.filter(v => (v.grupo || 'Otros') === g);
  }

  toggleGrupo(g: string): void {
    if (this.gruposAbiertos.has(g)) {
      this.gruposAbiertos.delete(g);
    } else {
      this.gruposAbiertos.add(g);
      this.grupoActivo = g; // el preview sigue a la sección que se acaba de abrir
    }
  }

  grupoAbierto(g: string): boolean {
    return this.gruposAbiertos.has(g);
  }

  iniciarEdicion(v: ITemaVariable): void {
    this.editandoId = v.id ?? null;
    this.grupoActivo = v.grupo || 'Otros';
    this.form.patchValue({
      clave: v.clave,
      etiqueta: v.etiqueta,
      grupo: v.grupo ?? '',
      tipo: v.tipo,
      valorClaro: v.valorClaro,
      valorOscuro: v.valorOscuro ?? '',
      orden: v.orden ?? null
    });
    this.previsualizar();
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.form.reset({ tipo: 'color' });
    this.svc.previsualizar(this.variables);
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;
    const body: ITemaVariable = {
      ...this.form.value,
      clave: this.form.value.clave.trim(),
      valorOscuro: this.form.value.valorOscuro?.trim() || null
    };
    const op$ = this.editandoId !== null
      ? this.svc.actualizar(this.editandoId, body)
      : this.svc.crear(body);
    op$.subscribe({
      next: () => {
        this.guardando = false;
        this.cancelarEdicion();
        this.cargar();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        this.guardando = false;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al guardar' });
      }
    });
  }

  eliminar(v: ITemaVariable): void {
    Swal.fire({
      title: `¿Eliminar "${v.etiqueta}"?`,
      text: 'La app vuelve a usar el valor fijo de código para esta variable hasta que se dé de alta otra vez.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.eliminar(v.id!).subscribe({
        next: () => {
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: err?.error?.mensaje })
      });
    });
  }

  /** Se llama en cada (input)/(change) del form -- aplica en vivo lo que se está editando, sin guardar todavía. */
  previsualizar(): void {
    const enEdicion: ITemaVariable = { ...this.form.value, id: this.editandoId ?? undefined };
    const preview = this.editandoId !== null
      ? this.variables.map(v => (v.id === this.editandoId ? enEdicion : v))
      : [...this.variables, enEdicion];
    this.svc.previsualizar(preview);
    // Si se está dando de alta una variable nueva (no editando una existente) y ya se escribió un
    // grupo, el preview de la derecha sigue a ese grupo en vivo -- igual que al editar una fila.
    if (this.editandoId === null && this.form.value.grupo) {
      this.grupoActivo = this.form.value.grupo;
    }
  }
}
