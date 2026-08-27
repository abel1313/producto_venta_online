// Catálogo de menú/submenú del sidebar -- ver PLAN_PERMISOS_PANTALLAS.md (repo compartido,
// Fase 1). Reemplaza el array fijo GROUP_ROUTES de navbar.component.ts por datos editables.

export interface IMenu {
  id: number;
  nombre: string;
  icono?: string | null;
  orden?: number | null;
}

export interface IMenuRequest {
  nombre: string;
  icono?: string | null;
  orden?: number | null;
}

export interface ISubmenu {
  id: number;
  menu?: IMenu | null;   // null = item de nivel superior sin grupo (Home, Tienda, etc.)
  nombre: string;
  ruta: string;
  icono?: string | null;
  orden?: number | null;
}

export interface ISubmenuRequest {
  menu?: { id: number } | null;
  nombre: string;
  ruta: string;
  icono?: string | null;
  orden?: number | null;
}

// Rol -- submenus viene ya anidado (Roles.submenus es @ManyToMany EAGER en el back), asi que
// GET /v1/roles/getAll trae de una vez las pantallas asignadas a cada rol.
// submenusEscritura (Fase 2 de permisos de accion, 2026-08-27) es un SUBCONJUNTO de submenus:
// de las pantallas que el rol puede VER, cuales ademas puede ESCRIBIR (crear/editar/borrar).
export interface IRol {
  id: number;
  nombreRol: string;
  submenus?: ISubmenu[];
  submenusEscritura?: ISubmenu[];
}

export interface IRolRequest {
  nombreRol: string;
}
