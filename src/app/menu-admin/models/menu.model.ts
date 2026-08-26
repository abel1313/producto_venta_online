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
