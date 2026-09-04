import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { from, Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IAccionSubmenu, IMenu, IRol, ISubmenu } from '../models/menu.model';
import { MenuAdminService } from '../service/menu.service';
import { RolAdminService } from '../service/rol.service';

interface GrupoSubmenus {
  menu: IMenu | null;   // null = "Sin grupo"
  submenus: ISubmenu[];
}

// Estado de una pantalla (Ver/Editar/acciones) mientras el admin la esta editando en pantalla,
// ANTES de que le de "Actualizar" -- ver EstadoLocal mas abajo (2026-09-04).
interface EstadoSubmenuLocal {
  ver: boolean;
  editar: boolean;
  accionIds: Set<number>;
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
//
// Guardado diferido por pantalla (2026-09-04): antes CADA checkbox (Ver, Editar, o una accion
// puntual) disparaba su propia peticion al toque de marcarlo/desmarcarlo -- si el admin estaba
// ajustando 5 acciones de una pantalla, eran 5 peticiones seguidas. El usuario pidio que los
// checks se acumulen en LOCAL y cada pantalla (gr-submenu-block) tenga su propio boton
// "Actualizar" que recien ahi manda los cambios pendientes de ESA pantalla. Ver EstadoSubmenuLocal
// / estadoLocal / entradaLocal / actualizarSubmenu.
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

  // Guardando (Actualizar) EN CURSO para la pantalla con este submenu.id -- null = ninguna.
  guardandoActualizacionId: number | null = null;

  // Estado local de cada pantalla mientras el admin la edita, ANTES de "Actualizar" -- solo trae
  // entrada para las pantallas que ya se tocaron (se siembra sola con el estado real del server
  // la primera vez que se lee/toca, ver entradaLocal()). Se limpia entera al cambiar de rol
  // (seleccionarRol) y se borra la entrada de una pantalla puntual despues de guardarla bien.
  private estadoLocal = new Map<number, EstadoSubmenuLocal>();

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

  // Agrupa el checklist de acciones de una pantalla en bloques por categoria (2026-09-04,
  // pedido del usuario: con 15+ acciones en Modelos salian todas juntas, sin separar
  // "Filtros" de las opciones de la tarjeta o del buscador). Agrupa por TRAMOS CONTIGUOS de la
  // lista ya ordenada por `orden` -- no reordena por su cuenta, así que las filas de una misma
  // categoria tienen que venir con `orden` consecutivo desde el back (ver
  // migration_accion_submenu_categoria.sql). Sin categoria (null) cae en "Otras acciones".
  gruposDeAcciones(submenu: ISubmenu): { categoria: string; acciones: IAccionSubmenu[] }[] {
    const grupos: { categoria: string; acciones: IAccionSubmenu[] }[] = [];
    for (const accion of this.accionesDe(submenu)) {
      const categoria = accion.categoria || 'Otras acciones';
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.categoria === categoria) {
        ultimo.acciones.push(accion);
      } else {
        grupos.push({ categoria, acciones: [accion] });
      }
    }
    return grupos;
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

  // Igual que verInfoAccion() pero para la pantalla (Submenu) misma -- qué es y dónde vive en el
  // menú, no solo qué significa el checkbox Ver en abstracto (eso lo cubre verInfoVerEditar()).
  verInfoSubmenu(submenu: ISubmenu): void {
    Swal.fire({
      icon: 'info',
      title: `${submenu.icono ?? ''} ${submenu.nombre}`.trim(),
      html: submenu.descripcion || 'Todavía no tiene descripción cargada.',
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
        <p style="text-align:left">Los cambios que hagas aquí se acumulan -- no se guardan solos.
        Cuando termines de marcar/desmarcar lo que quieras en una pantalla, dale a su botón
        "💾 Actualizar" para mandarlos.</p>
      `,
      confirmButtonText: 'Entendido'
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
    // Cambiar de rol descarta cualquier check pendiente sin guardar del rol anterior -- cada
    // pantalla vuelve a leer directo del server para el rol recien elegido.
    this.estadoLocal.clear();
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
  // Cuenta lo REALMENTE guardado (server), no los checks pendientes sin actualizar todavía.
  contarAsignadas(g: GrupoSubmenus): number {
    if (!this.rolSeleccionado?.submenus) return 0;
    const idsDelRol = new Set(this.rolSeleccionado.submenus.map(s => s.id));
    return g.submenus.filter(s => idsDelRol.has(s.id)).length;
  }

  // ── Estado local (pendiente de guardar) de cada pantalla ────────────────────────────────

  // Foto real de lo que el rol seleccionado tiene guardado en el server para esta pantalla --
  // la base contra la que se compara el estado local para saber si hay cambios pendientes.
  private estadoServidor(s: ISubmenu): EstadoSubmenuLocal {
    const idsAccion = new Set(
      this.accionesDe(s)
        .filter(a => !!this.rolSeleccionado?.acciones?.some(x => x.id === a.id))
        .map(a => a.id)
    );
    return {
      ver: !!this.rolSeleccionado?.submenus?.some(x => x.id === s.id),
      editar: !!this.rolSeleccionado?.submenusEscritura?.some(x => x.id === s.id),
      accionIds: idsAccion
    };
  }

  // Entrada editable en memoria de esta pantalla -- se siembra sola con el estado real del
  // server la primera vez que se lee o se toca un checkbox de esa pantalla.
  private entradaLocal(s: ISubmenu): EstadoSubmenuLocal {
    let entrada = this.estadoLocal.get(s.id);
    if (!entrada) {
      entrada = this.estadoServidor(s);
      this.estadoLocal.set(s.id, entrada);
    }
    return entrada;
  }

  // ¿Esta pantalla tiene algun check marcado/desmarcado en pantalla que todavia no se mando
  // con "Actualizar"? Controla si se muestra el boton de esa pantalla.
  hayCambios(s: ISubmenu): boolean {
    const local = this.estadoLocal.get(s.id);
    if (!local) return false;
    const base = this.estadoServidor(s);
    if (local.ver !== base.ver) return true;
    if (!local.ver) return false; // si Ver quedo apagado, Editar/acciones no importan (el back cascadea)
    if (local.editar !== base.editar) return true;
    for (const accion of this.accionesDe(s)) {
      if (local.accionIds.has(accion.id) !== base.accionIds.has(accion.id)) return true;
    }
    return false;
  }

  estaGuardando(s: ISubmenu): boolean {
    return this.guardandoActualizacionId === s.id;
  }

  // Tira los checks pendientes de esta pantalla sin mandarlos -- vuelve a mostrar lo que
  // realmente tiene guardado el rol en el server.
  descartarCambios(s: ISubmenu): void {
    this.estadoLocal.delete(s.id);
  }

  tieneSubmenu(submenu: ISubmenu): boolean {
    return this.entradaLocal(submenu).ver;
  }

  toggleSubmenu(submenu: ISubmenu): void {
    if (!this.rolSeleccionado) return;
    const yaLaTiene = this.tieneSubmenu(submenu);
    if (yaLaTiene && this.esSubmenuProtegido(submenu)) {
      Swal.fire({ icon: 'info', title: 'No se puede quitar', text: `"${submenu.nombre}" es una pantalla protegida para ROLE_ADMIN -- sin ella nadie podría volver a asignar permisos.` });
      return;
    }
    this.entradaLocal(submenu).ver = !yaLaTiene;
  }

  // ── Fase 2 de permisos de accion: además de VER, ¿puede ESCRIBIR (crear/editar/borrar)? ──

  tieneSubmenuEscritura(submenu: ISubmenu): boolean {
    return this.entradaLocal(submenu).editar;
  }

  toggleSubmenuEscritura(submenu: ISubmenu): void {
    if (!this.rolSeleccionado) return;
    if (!this.tieneSubmenu(submenu)) return; // el checkbox ya viene deshabilitado en este caso
    const yaLaTiene = this.tieneSubmenuEscritura(submenu);
    if (yaLaTiene && this.esSubmenuProtegido(submenu)) {
      Swal.fire({ icon: 'info', title: 'No se puede quitar', text: `"${submenu.nombre}" es una pantalla protegida para ROLE_ADMIN -- sin ella nadie podría volver a asignar permisos.` });
      return;
    }
    this.entradaLocal(submenu).editar = !yaLaTiene;
  }

  tieneAccion(accion: IAccionSubmenu): boolean {
    return this.entradaLocal(accion.submenu).accionIds.has(accion.id);
  }

  toggleAccion(accion: IAccionSubmenu): void {
    if (!this.rolSeleccionado) return;
    if (!this.tieneSubmenu(accion.submenu)) return; // el checkbox ya viene deshabilitado en este caso
    const entrada = this.entradaLocal(accion.submenu);
    if (entrada.accionIds.has(accion.id)) {
      entrada.accionIds.delete(accion.id);
    } else {
      entrada.accionIds.add(accion.id);
    }
  }

  // Manda los cambios pendientes de ESTA pantalla nada más -- Ver, Editar y cada acción, en el
  // orden que el back necesita (agregar Ver antes que Editar/acciones; si Ver se apaga, el back
  // ya cascadea Editar+acciones solo, así que no hace falta mandar nada más en ese caso).
  actualizarSubmenu(s: ISubmenu): void {
    if (!this.rolSeleccionado || !this.hayCambios(s)) return;
    const rolId = this.rolSeleccionado.id;
    const base = this.estadoServidor(s);
    const local = this.entradaLocal(s);
    const operaciones: Array<() => Observable<IRol>> = [];

    if (!local.ver && base.ver) {
      operaciones.push(() => this.rolSvc.quitarSubmenu(rolId, s.id));
    } else {
      if (local.ver && !base.ver) {
        operaciones.push(() => this.rolSvc.agregarSubmenu(rolId, s.id));
      }
      if (local.editar !== base.editar) {
        operaciones.push(() => local.editar
          ? this.rolSvc.agregarSubmenuEscritura(rolId, s.id)
          : this.rolSvc.quitarSubmenuEscritura(rolId, s.id));
      }
      for (const accion of this.accionesDe(s)) {
        const tenia = base.accionIds.has(accion.id);
        const tiene = local.accionIds.has(accion.id);
        if (tenia !== tiene) {
          operaciones.push(() => tiene
            ? this.rolSvc.agregarAccion(rolId, accion.id)
            : this.rolSvc.quitarAccion(rolId, accion.id));
        }
      }
    }

    if (operaciones.length === 0) return;

    this.guardandoActualizacionId = s.id;
    from(operaciones).pipe(
      concatMap(op => op())
    ).subscribe({
      next: rolActualizado => {
        this.rolSeleccionado = rolActualizado;
        this.roles = this.roles.map(r => r.id === rolActualizado.id ? rolActualizado : r);
      },
      error: err => {
        this.guardandoActualizacionId = null;
        // No se sabe cuáles de las operaciones ya alcanzaron a aplicarse -- se descarta la
        // entrada local (lo que se ve pasa a reflejar directo lo que sí quedó guardado, que
        // rolSeleccionado ya trae actualizado por cada "next" que sí llegó a pasar).
        this.estadoLocal.delete(s.id);
        Swal.fire({ icon: 'error', title: err?.error?.mensaje ?? 'Error al actualizar', text: 'Los cambios que sí alcanzaron a aplicarse quedaron guardados; revisá los checks e intentá de nuevo con el resto.' });
      },
      complete: () => {
        this.guardandoActualizacionId = null;
        this.estadoLocal.delete(s.id);
        Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1200, showConfirmButton: false });
      }
    });
  }
}
