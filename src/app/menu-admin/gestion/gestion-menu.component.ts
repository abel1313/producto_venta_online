import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { IMenu, ISubmenu } from '../models/menu.model';
import { MenuAdminService } from '../service/menu.service';

// Admin de Menu/Submenu -- ver PLAN_PERMISOS_PANTALLAS.md (repo compartido, Fase 1). Reemplaza
// el array fijo GROUP_ROUTES de navbar.component.ts por un catálogo editable: "Menu" es el
// grupo del acordeón (ej. "Catálogo"), "Submenu" es el item real que navega a una pantalla
// (ej. "Modelos" -> productos/buscar). Los submenus sin grupo (menu=null) son los que hoy
// viven sueltos en el sidebar (Home, Tienda, Favoritos, Chat, QR, Login).
@Component({
  selector: 'app-gestion-menu',
  templateUrl: './gestion-menu.component.html',
  styleUrls: ['./gestion-menu.component.scss']
})
export class GestionMenuComponent implements OnInit {

  menus: IMenu[] = [];
  cargandoMenus = false;
  guardandoMenu = false;
  editandoMenuId: number | null = null;
  menuForm!: FormGroup;

  // Submenu -- ninguno seleccionado = pantalla vacía a la derecha, hasta que se elija un menú
  // (o "Sin grupo") de la lista de la izquierda.
  menuSeleccionado: IMenu | null = null;
  viendoSinGrupo = false;
  submenus: ISubmenu[] = [];
  cargandoSubmenus = false;
  guardandoSubmenu = false;
  editandoSubmenuId: number | null = null;
  submenuForm!: FormGroup;

  constructor(
    private readonly svc: MenuAdminService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.menuForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(60)]],
      icono: ['', [Validators.maxLength(10)]],
      orden: [null]
    });
    this.submenuForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      ruta: ['', [Validators.required, Validators.maxLength(150)]],
      icono: ['', [Validators.maxLength(10)]],
      // Texto del botón ℹ️ en Gestión de roles (2026-08-28) -- qué es esta pantalla y dónde vive
      // en el menú. Opcional: si se deja vacío, el popup dice "Todavía no tiene descripción".
      descripcion: ['', [Validators.maxLength(255)]],
      // Texto del botón ℹ️ propio de "Editar" (2026-09-04) -- ver comentario en el HTML.
      descripcionEscritura: ['', [Validators.maxLength(255)]],
      orden: [null]
    });
    this.cargarMenus();
  }

  // ── Menu ──────────────────────────────────────────────────────────

  cargarMenus(): void {
    this.cargandoMenus = true;
    this.svc.getMenus().subscribe({
      next: data => {
        this.menus = [...data].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        this.cargandoMenus = false;
      },
      error: () => { this.cargandoMenus = false; }
    });
  }

  iniciarEdicionMenu(m: IMenu): void {
    this.editandoMenuId = m.id;
    this.menuForm.patchValue({ nombre: m.nombre, icono: m.icono ?? '', orden: m.orden ?? null });
  }

  cancelarEdicionMenu(): void {
    this.editandoMenuId = null;
    this.menuForm.reset();
  }

  guardarMenu(): void {
    if (this.menuForm.invalid) { this.menuForm.markAllAsTouched(); return; }
    this.guardandoMenu = true;
    const body = {
      nombre: this.menuForm.value.nombre.trim(),
      icono: this.menuForm.value.icono?.trim() || null,
      orden: this.menuForm.value.orden
    };
    const op$ = this.editandoMenuId !== null
      ? this.svc.updateMenu(this.editandoMenuId, body)
      : this.svc.saveMenu(body);
    op$.subscribe({
      next: () => {
        this.guardandoMenu = false;
        this.cancelarEdicionMenu();
        this.cargarMenus();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        this.guardandoMenu = false;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al guardar' });
      }
    });
  }

  eliminarMenu(m: IMenu): void {
    Swal.fire({
      title: `¿Eliminar el menú "${m.nombre}"?`,
      text: 'Sus submenús se eliminan también (quedan sin grupo si prefieres conservarlos, muévelos antes).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.deleteMenu(m.id).subscribe({
        next: () => {
          if (this.menuSeleccionado?.id === m.id) this.menuSeleccionado = null;
          this.cargarMenus();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: err?.error?.mensaje })
      });
    });
  }

  // ── Selección de menú (o "Sin grupo") para ver/editar sus submenús ──

  seleccionarMenu(m: IMenu): void {
    this.menuSeleccionado = m;
    this.viendoSinGrupo = false;
    this.cancelarEdicionSubmenu();
    this.cargarSubmenusDeMenu(m.id);
  }

  seleccionarSinGrupo(): void {
    this.menuSeleccionado = null;
    this.viendoSinGrupo = true;
    this.cancelarEdicionSubmenu();
    this.cargandoSubmenus = true;
    // No hay endpoint dedicado para "solo los que no tienen grupo" -- se filtra del listado
    // completo, que en este catálogo (decenas de filas, no miles) es barato.
    this.svc.getSubmenus().subscribe({
      next: data => {
        this.submenus = data.filter(s => !s.menu).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        this.cargandoSubmenus = false;
      },
      error: () => { this.cargandoSubmenus = false; }
    });
  }

  private cargarSubmenusDeMenu(menuId: number): void {
    this.cargandoSubmenus = true;
    this.svc.getSubmenusPorMenu(menuId).subscribe({
      next: data => {
        this.submenus = [...data].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
        this.cargandoSubmenus = false;
      },
      error: () => { this.cargandoSubmenus = false; }
    });
  }

  // ── Submenu ───────────────────────────────────────────────────────

  iniciarEdicionSubmenu(s: ISubmenu): void {
    this.editandoSubmenuId = s.id;
    this.submenuForm.patchValue({
      nombre: s.nombre,
      ruta: s.ruta,
      icono: s.icono ?? '',
      descripcion: s.descripcion ?? '',
      descripcionEscritura: s.descripcionEscritura ?? '',
      orden: s.orden ?? null
    });
  }

  cancelarEdicionSubmenu(): void {
    this.editandoSubmenuId = null;
    this.submenuForm.reset();
  }

  guardarSubmenu(): void {
    if (this.submenuForm.invalid) { this.submenuForm.markAllAsTouched(); return; }
    this.guardandoSubmenu = true;
    const body = {
      menu: this.menuSeleccionado ? { id: this.menuSeleccionado.id } : null,
      nombre: this.submenuForm.value.nombre.trim(),
      ruta: this.submenuForm.value.ruta.trim().replace(/^\//, ''),
      icono: this.submenuForm.value.icono?.trim() || null,
      descripcion: this.submenuForm.value.descripcion?.trim() || null,
      descripcionEscritura: this.submenuForm.value.descripcionEscritura?.trim() || null,
      orden: this.submenuForm.value.orden
    };
    const op$ = this.editandoSubmenuId !== null
      ? this.svc.updateSubmenu(this.editandoSubmenuId, body)
      : this.svc.saveSubmenu(body);
    op$.subscribe({
      next: () => {
        this.guardandoSubmenu = false;
        this.cancelarEdicionSubmenu();
        if (this.viendoSinGrupo) this.seleccionarSinGrupo();
        else if (this.menuSeleccionado) this.cargarSubmenusDeMenu(this.menuSeleccionado.id);
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
      },
      error: err => {
        this.guardandoSubmenu = false;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al guardar' });
      }
    });
  }

  eliminarSubmenu(s: ISubmenu): void {
    Swal.fire({
      title: `¿Eliminar "${s.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.deleteSubmenu(s.id).subscribe({
        next: () => {
          if (this.viendoSinGrupo) this.seleccionarSinGrupo();
          else if (this.menuSeleccionado) this.cargarSubmenusDeMenu(this.menuSeleccionado.id);
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
        },
        error: err => Swal.fire({ icon: 'error', title: 'Error al eliminar', text: err?.error?.mensaje })
      });
    });
  }
}
