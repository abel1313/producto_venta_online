/**
 * Módulo "Flores eternas" — ramos de rosas eternas configurables.
 *
 * ⚠️ Dos convenciones distintas de paginación conviven aquí, y NO es un error de tipeo:
 * - Los 4 catálogos simples usan el CRUD genérico → `page` **base-0** + `size`.
 * - Ramos armados usa rutas propias (estilo `/v1/promociones`) → `pagina` **base-1** + `size`.
 * El back lo advirtió explícitamente; es una inconsistencia que ya existe entre módulos del
 * proyecto, no algo nuevo de esta entrega. Respetar cada una en su endpoint.
 */

// ── Catálogos simples (CRUD genérico) ────────────────────────────────────────

export interface ITipoFlor {
  id: number;
  nombre: string;
  precioPorFlor: number;
  activo: boolean;
}

/** Qué cantidades de flores "cierran bien el círculo" para un tipo de flor dado. */
export interface ICantidadFlor {
  id: number;
  /**
   * El GET lo devuelve completo; al guardar basta con `{ id }` (ver `ICantidadFlorRequest`).
   *
   * ⚠️ Opcional a propósito, aunque el back siempre lo mande: es un objeto anidado que viene de
   * otra tabla. Si un solo renglón llegara con esto en `null`, un acceso directo tiraría
   * `TypeError` a media `*ngFor` y **desaparecería el resto de la lista** — el bug se ve como
   * "solo aparece el primero", que despista muchísimo. Ya pasó en el módulo de rifas.
   */
  tipoFlor?: ITipoFlor;
  cantidad: number;
  activo: boolean;
}

export interface ICantidadFlorRequest {
  id?: number;
  tipoFlor: { id: number };
  cantidad: number;
  activo: boolean;
}

export interface IAccesorioRamo {
  id: number;
  nombre: string;
  precio: number;
  /** Si el accesorio permite que el cliente escriba un texto suyo. */
  admiteTextoLibre: boolean;
  /**
   * Marca cuál accesorio es "el papel", para la regla del umbral: con más de 10 flores el
   * papel se cobra solo. Debería haber como máximo UNO activo con esto en `true`.
   */
  esPapel: boolean;
  activo: boolean;
}

export interface IFraseListon {
  id: number;
  texto: string;
  precio: number;
  activo: boolean;
}

// ── Ramos preconfigurados (CRUD propio, estilo /v1/promociones) ──────────────

export interface IRamoAccesorioRequest {
  accesorioId: number;
  cantidad: number;
}

export interface IRamoArmadoRequest {
  nombre: string;
  tipoFlorId: number;
  cantidadFlorValidaId: number;
  accesorios: IRamoAccesorioRequest[];
  activo: boolean;
}

export interface IRamoAccesorioCalculado {
  accesorioId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface IRamoArmado {
  id: number;
  nombre: string;
  tipoFlorId: number;
  tipoFlorNombre: string;
  cantidad: number;
  precioFlores: number;
  /** Lo calcula el back solo cuando `cantidad > 10` — el front no lo manda ni lo agrega. */
  papelIncluido: boolean;
  precioPapel: number;
  accesorios: IRamoAccesorioCalculado[];
  precioTotal: number;
  activo: boolean;
}

export interface IRamoArmadoPaginable {
  t: IRamoArmado[];
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

// ── Motor de cálculo (público, sin login) ────────────────────────────────────

export interface IValidarCantidadRequest {
  tipoFlorId: number;
  cantidadSolicitada: number;
}

/**
 * Si `valida` es `true`, las 4 alternativas vienen en `null` y no hay nada que ofrecer.
 * También responde `valida: true` cuando la cantidad pedida es menor a la más chica del
 * catálogo (venta por unidad — ahí no aplica el ajuste del círculo).
 */
export interface IValidarCantidadResponse {
  cantidadSolicitada: number;
  precioCantidadSolicitada: number;
  valida: boolean;
  mensaje: string | null;
  alternativaMenor: number | null;
  precioAlternativaMenor: number | null;
  alternativaMayor: number | null;
  precioAlternativaMayor: number | null;
}

/** Cada entrada es UN listón: o frase predefinida, o personalizada. Nunca las dos ni ninguna. */
export interface IListonRequest {
  fraseListonPredefinidaId?: number;
  fraseListonPersonalizada?: string;
}

export interface ICalcularPrecioRequest {
  tipoFlorId: number;
  cantidadFinal: number;
  /** Repetir la misma entrada por cada unidad: dos veces `{accesorioId:3}` = 2 unidades. */
  accesorios: { accesorioId: number }[];
  listones: IListonRequest[];
  lugarEntregaId?: number;
  recogerEnLocal?: boolean;
}

export interface IListonCalculado {
  texto: string;
  tipo: 'PREDEFINIDA' | 'PERSONALIZADA_PENDIENTE';
  /** `null` en las personalizadas: su precio todavía no existe, por eso el total es provisional. */
  precio: number | null;
}

export interface ICalcularPrecioResponse {
  cantidadFinal: number;
  precioBase: number;
  papelObligatorioAplicado: boolean;
  precioPapel: number;
  accesoriosCalculados: (IRamoAccesorioCalculado & { agregadoAutomaticoPorRegla: boolean })[];
  subtotalAccesorios: number;
  listonesCalculados: IListonCalculado[];
  subtotalListones: number;
  /** Si es `true`, el `total` es PROVISIONAL y hay que mostrar anticipo + aviso de no reembolso. */
  tieneListonPendienteValidacion: boolean;
  requiereAnticipo50Porciento: boolean;
  montoAnticipoSugerido: number | null;
  /** Texto de política de negocio — mostrar tal cual, no reescribir. */
  avisoNoReembolso: string | null;
  recogerEnLocal: boolean;
  /** `null` si todavía no se eligió lugar ni recoger en local; no cuenta en el total. */
  costoEnvio: number | null;
  total: number;
}
