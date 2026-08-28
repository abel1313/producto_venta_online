import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { IAccionSubmenu, IMenu, IRol, ISubmenu } from '../models/menu.model';
import { MenuAdminService } from '../service/menu.service';
import { RolAdminService } from '../service/rol.service';

interface GrupoSubmenus {
  menu: IMenu | null;   // null = "Sin grupo"
  submenus: ISubmenu[];
}

// Rutas que ROLE_ADMIN nunca puede perder -- son las pantallas que asignan permisos. Si se le
// quitan, nadie puede volver a dárselas (el back también lo bloquea, esto es solo para no dejar
// clickear algo que de todos modos va a rechazar).
const RUTAS_PROTEGIDAS_ADMIN = new Set(['gestion-menu', 'gestion-menu/roles']);
const ROL_ADMIN = 'ROLE_ADMIN';

// Gestión de roles -- PLAN_PERMISOS_PANTALLAS.md sección 3: los roles dejan de ser los 4 fijos
// del código, el admin crea/edita/borra roles y marca con checkboxes qué pantallas (Submenu) ve
// cada uno. Fase 2 de permisos de acción (2026-08-27): un segundo checkbox por pantalla ("Editar")
// separa VER (rol_submenu, sin cambios) de ESCRIBIR (rol_submenu_escritura, nuevo) -- antes era
// todo-o-nada: dar una pantalla daba automáticamente el CRUD completo.
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
  guardandoEscrituraId: number | null = null;
  guardandoAccionId: number | null = null;

  // Catalogo de acciones granulares por pantalla (Fase 3, piloto en Modelos 2026-08-27),
  // agrupado por submenu.id -- la mayoria de las pantallas hoy no tienen ninguna, solo Modelos.
  accionesPorSubmenu = new Map<number, IAccionSubmenu[]>();

  // Acordeón -- igual que el navbar: arrancan todos cerrados, uno a la vez abierto, para no
  // tirar los ~40 submenus de un jalón. 'sin-grupo' identifica al pseudo-grupo de items sueltos.
  grupoAbierto: number | 'sin-grupo' | null = null;

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
    this.rolSvc.getAcciones().subscribe({
      next: acciones => {
        const mapa = new Map<number, IAccionSubmenu[]>();
        for (const a of acciones) {
          const lista = mapa.get(a.submenu.id) ?? [];
          lista.push(a);
          mapa.set(a.submenu.id, lista.sort((x, y) => (x.orden ?? 999) - (y.orden ?? 999)));
        }
        this.accionesPorSubmenu = mapa;
      },
      error: () => {}
    });
  }

  // ── Fase 3 de permisos: acciones puntuales dentro de una pantalla (piloto en Modelos) ────

  accionesDe(submenu: ISubmenu): IAccionSubmenu[] {
    return this.accionesPorSubmenu.get(submenu.id) ?? [];
  }

  // Popup con "¿para qué sirve? ¿dónde lo veo?" -- pedido del usuario 2026-08-28: el tooltip al
  // pasar el mouse (title="...") no alcanzaba, quería poder hacer clic y que quedara a la vista
  // explícitamente, con la ubicación real en la pantalla ("puedes ir aquí, aquí o aquí").
  verInfoAccion(accion: IAccionSubmenu): void {
    Swal.fire({
      icon: 'info',
      title: accion.etiqueta,
      html: accion.descripcion || 'Todavía no tiene descripción cargada.',
      confirmButtonText: 'Entendido'
    });
  }

  verInfoVerEditar(): void {
    Swal.fire({
      icon: 'info',
      title: 'Ver y Editar',
      html: `
        <p style="text-align:left"><b>👁️ Ver</b> deja entrar a esa pantalla del menú -- sin esto,
        aunque se le den acciones puntuales de abajo, el usuario ni siquiera puede navegar ahí.</p>
        <p style="text-align:left"><b>✏️ Editar</b> deja además guardar cambios ahí (crear,
        actualizar, borrar) -- necesita "Ver" marcado primero, si no hay pantalla donde editar.</p>
        <p style="text-align:left">Las acciones puntuales que aparecen debajo de algunas pantallas
        (ej. "Habilitar", los filtros) son más finas todavía: dejan usar UN botón/opción concreto
        de esa pantalla sin dar todo "Editar".</p>
      `,
      confirmButtonText: 'Entendido'
    });
  }

  tieneAccion(accion: IAccionSubmenu): boolean {
    return !!this.rolSeleccionado?.acciones?.some(a => a.id === accion.id);
  }

  toggleAccion(accion: IAccionSubmenu): void {
    if (!this.rolSeleccionado) return;
    const rolId = this.rolSeleccionado.id;
    this.guardandoAccionId = accion.id;
    const op$ = this.tieneAccion(accion)
      ? this.rolSvc.quitarAccion(rolId, accion.id)
      : this.rolSvc.agregarAccion(rolId, accion.id);
    op$.subscribe({
      next: rolActualizado => {
        this.rolSeleccionado = rolActualizado;
        this.roles = this.roles.map(r => r.id === rolActualizado.id ? rolActualizado : r);
        this.guardandoAccionId = null;
      },
      error: err => {
        this.guardandoAccionId = null;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al actualizar' });
      }
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

  esRolAdmin(r: IRol): boolean {
    return r.nombreRol === ROL_ADMIN;
  }

  esSubmenuProtegido(submenu: ISubmenu): boolean {
    return this.esRolAdmin(this.rolSeleccionado!) && RUTAS_PROTEGIDAS_ADMIN.has(submenu.ruta);
  }

  eliminarRol(r: IRol): void {
    if (this.esRolAdmin(r)) {
      Swal.fire({ icon: 'info', title: 'ROLE_ADMIN no se puede eliminar', text: 'Es el único rol con acceso garantizado a esta pantalla.' });
      return;
    }
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
    this.grupoAbierto = null;
  }

  toggleGrupo(g: GrupoSubmenus): void {
    const clave = g.menu ? g.menu.id : 'sin-grupo';
    this.grupoAbierto = this.grupoAbierto === clave ? null : clave;
  }

  grupoEstaAbierto(g: GrupoSubmenus): boolean {
    return this.grupoAbierto === (g.menu ? g.menu.id : 'sin-grupo');
  }

  // Cuántas de las pantallas de este grupo tiene el rol seleccionado -- se muestra en el
  // encabezado cerrado para no tener que abrir cada grupo solo para ver si tiene algo marcado.
  contarAsignadas(g: GrupoSubmenus): number {
    if (!this.rolSeleccionado?.submenus) return 0;
    const idsDelRol = new Set(this.rolSeleccionado.submenus.map(s => s.id));
    return g.submenus.filter(s => idsDelRol.has(s.id)).length;
  }

  tieneSubmenu(submenu: ISubmenu): boolean {
    return !!this.rolSeleccionado?.submenus?.some(s => s.id === submenu.id);
  }

  toggleSubmenu(submenu: ISubmenu): void {
    if (!this.rolSeleccionado) return;
    if (this.tieneSubmenu(submenu) && this.esSubmenuProtegido(submenu)) {
      Swal.fire({ icon: 'info', title: 'No se puede quitar', text: `"${submenu.nombre}" es una pantalla protegida para ROLE_ADMIN -- sin ella nadie podría volver a asignar permisos.` });
      return;
    }
    const rolId = this.rolSeleccionado.id;
    this.guardandoSubmenuId = submenu.id;
    const op$ = this.tieneSubmenu(submenu)
      ? this.rolSvc.quitarSubmenu(rolId, submenu.id)
      : this.rolSvc.agregarSubmenu(rolId, submenu.id);
    op$.subscribe({
      next: rolActualizado => {
        // Si se quitó el "ver", el back cascadea y también quita el "editar" -- rolActualizado
        // ya viene con ambos sets consistentes, no hace falta tocar nada más aquí.
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

  // ── Fase 2 de permisos de accion: además de VER, ¿puede ESCRIBIR (crear/editar/borrar)? ──

  tieneSubmenuEscritura(submenu: ISubmenu): boolean {
    return !!this.rolSeleccionado?.submenusEscritura?.some(s => s.id === submenu.id);
  }

  toggleSubmenuEscritura(submenu: ISubmenu): void {
    if (!this.rolSeleccionado) return;
    if (!this.tieneSubmenu(submenu)) return; // el checkbox ya viene deshabilitado en este caso
    if (this.tieneSubmenuEscritura(submenu) && this.esSubmenuProtegido(submenu)) {
      Swal.fire({ icon: 'info', title: 'No se puede quitar', text: `"${submenu.nombre}" es una pantalla protegida para ROLE_ADMIN -- sin ella nadie podría volver a asignar permisos.` });
      return;
    }
    const rolId = this.rolSeleccionado.id;
    this.guardandoEscrituraId = submenu.id;
    const op$ = this.tieneSubmenuEscritura(submenu)
      ? this.rolSvc.quitarSubmenuEscritura(rolId, submenu.id)
      : this.rolSvc.agregarSubmenuEscritura(rolId, submenu.id);
    op$.subscribe({
      next: rolActualizado => {
        this.rolSeleccionado = rolActualizado;
        this.roles = this.roles.map(r => r.id === rolActualizado.id ? rolActualizado : r);
        this.guardandoEscrituraId = null;
      },
      error: err => {
        this.guardandoEscrituraId = null;
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al actualizar' });
      }
    });
  }
}
