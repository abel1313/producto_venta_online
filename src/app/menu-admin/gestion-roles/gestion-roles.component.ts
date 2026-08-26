import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { IMenu, IRol, ISubmenu } from '../models/menu.model';
import { MenuAdminService } from '../service/menu.service';
import { RolAdminService } from '../service/rol.service';

interface GrupoSubmenus {
  menu: IMenu | null;   // null = "Sin grupo"
  submenus: ISubmenu[];
}

// Gestión de roles -- PLAN_PERMISOS_PANTALLAS.md sección 3: los roles dejan de ser los 4 fijos
// del código, el admin crea/edita/borra roles y marca con checkboxes qué pantallas (Submenu) ve
// cada uno. Fase 2 (permisos de acción) amplía esta misma pantalla más adelante.
@Component({
  selector: 'app-gestion-roles',
  templateUrl: './gestion-roles.component.html',
  styleUrls: ['./gestion-roles.component.scss']
})
export class GestionRolesComponent implements OnInit {

  roles: IRol[] = [];
  cargandoRoles = false;
  guardandoRol = false;
  editandoRolId: number | null = null;
  rolForm!: FormGroup;

  rolSeleccionado: IRol | null = null;
  grupos: GrupoSubmenus[] = [];
  cargandoCatalogo = false;
  guardandoSubmenuId: number | null = null;

  constructor(
    private readonly rolSvc: RolAdminService,
    private readonly menuSvc: MenuAdminService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.rolForm = this.fb.group({
      nombreRol: ['', [Validators.required, Validators.maxLength(60)]]
    });
    this.cargarRoles();
    this.cargarCatalogo();
  }

  cargarRoles(): void {
    this.cargandoRoles = true;
    this.rolSvc.getRoles().subscribe({
      next: data => {
        this.roles = data;
        if (this.rolSeleccionado) {
          this.rolSeleccionado = data.find(r => r.id === this.rolSeleccionado!.id) ?? null;
        }
        this.cargandoRoles = false;
      },
      error: () => { this.cargandoRoles = false; }
    });
  }

  private cargarCatalogo(): void {
    this.cargandoCatalogo = true;
    this.menuSvc.getMenus().subscribe(menus => {
      this.menuSvc.getSubmenus().subscribe(submenus => {
        const ordenados = [...menus].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        const grupos: GrupoSubmenus[] = ordenados.map(menu => ({
          menu,
          submenus: submenus
            .filter(s => s.menu?.id === menu.id)
            .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
        }));
        const sinGrupo = submenus
          .filter(s => !s.menu)
          .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        if (sinGrupo.length > 0) grupos.push({ menu: null, submenus: sinGrupo });
        this.grupos = grupos;
        this.cargandoCatalogo = false;
      });
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────

  iniciarEdicionRol(r: IRol): void {
    this.editandoRolId = r.id;
    this.rolForm.patchValue({ nombreRol: r.nombreRol });
  }

  cancelarEdicionRol(): void {
    this.editandoRolId = null;
    this.rolForm.reset();
  }

  guardarRol(): void {
    if (this.rolForm.invalid) { this.rolForm.markAllAsTouched(); return; }
    this.guardandoRol = true;
    const body = { nombreRol: this.rolForm.value.nombreRol.trim() };
    const op$ = this.editandoRolId !== null
      ? this.rolSvc.updateRol(this.editandoRolId, body)
      : this.rolSvc.saveRol(body);
    op$.subscribe({
      next: () => {
        this.guardandoRol = false;
        this.cancelarEdicionRol();
        this.cargarRoles();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        this.guardandoRol = false;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al guardar' });
      }
    });
  }

  eliminarRol(r: IRol): void {
    Swal.fire({
      title: `¿Eliminar el rol "${r.nombreRol}"?`,
      text: 'No se puede eliminar si hay usuarios con este rol asignado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.rolSvc.deleteRol(r.id).subscribe({
        next: () => {
          if (this.rolSeleccionado?.id === r.id) this.rolSeleccionado = null;
          this.cargarRoles();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: err?.error?.mensaje })
      });
    });
  }

  // ── Asignación de pantallas al rol seleccionado ──────────────────────

  seleccionarRol(r: IRol): void {
    this.rolSeleccionado = r;
  }

  tieneSubmenu(submenu: ISubmenu): boolean {
    return !!this.rolSeleccionado?.submenus?.some(s => s.id === submenu.id);
  }

  toggleSubmenu(submenu: ISubmenu): void {
    if (!this.rolSeleccionado) return;
    const rolId = this.rolSeleccionado.id;
    this.guardandoSubmenuId = submenu.id;
    const op$ = this.tieneSubmenu(submenu)
      ? this.rolSvc.quitarSubmenu(rolId, submenu.id)
      : this.rolSvc.agregarSubmenu(rolId, submenu.id);
    op$.subscribe({
      next: rolActualizado => {
        this.rolSeleccionado = rolActualizado;
        this.roles = this.roles.map(r => r.id === rolActualizado.id ? rolActualizado : r);
        this.guardandoSubmenuId = null;
      },
      error: err => {
        this.guardandoSubmenuId = null;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al actualizar' });
      }
    });
  }
}
