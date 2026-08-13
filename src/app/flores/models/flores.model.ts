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

/**
 * La **especie** (ej. "Rosa eterna"). Un solo precio por flor y una sola tabla de cantidades
 * válidas, sin importar el color.
 *
 * ⚠️ Ya NO tiene stock: el inventario vive en `IColorFlor`, que es lo vendible de verdad.
 */
export interface ITipoFlor {
  id: number;
  nombre: string;
  precioPorFlor: number;
  activo: boolean;
}

/**
 * Un **color vendible** de una especie (ej. "Rosa eterna" + "Rojo").
 *
 * Tiene stock propio y su propia variante interna, pero **hereda el precio y las cantidades
 * válidas de la especie** — por eso no lleva `precioPorFlor` ni tabla propia. Es lo que permite
 * armar un ramo mezclando colores sin duplicar la configuración por cada uno.
 */
export interface IColorFlor {
  id: number;
  /** Opcional por la misma razón que en `ICantidadFlor`: objeto anidado de otra tabla. */
  tipoFlor?: ITipoFlor;
  nombre: string;
  stock: number;
  activo: boolean;
}

export interface IColorFlorRequest {
  id?: number;
  tipoFlor: { id: number };
  nombre: string;
  stock: number;
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
   * Marca cuál accesorio es "el papel", para la regla del umbral. Máximo UNO activo con esto en
   * `true` — el back lo valida y responde 400 si se intenta guardar un segundo.
   */
  esPapel: boolean;
  /**
   * A partir de cuántas flores este accesorio se agrega **solo** al cobro.
   * `null` = nunca se agrega automático, queda como opcional siempre.
   *
   * Es configurable a propósito: antes el umbral estaba fijo en el código del back (10), así que
   * cambiarlo exigía un despliegue. Ahora el dueño lo edita desde la pantalla de accesorios.
   */
  umbralActivacion: number | null;
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
  /** Un ramo preconfigurado es un color específico, no una especie genérica. */
  colorFlorId: number;
  /** Id de `/v1/cantidades-flor` (la entidad `CantidadFlorValida`) — confirmado por el back. */
  cantidadFlorValidaId: number;
  accesorios: IRamoAccesorioRequest[];
  /** Link plano — el admin sube la imagen por fuera; todavía no pasa por micro_imagenes. */
  imagenUrl?: string | null;
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
  colorFlorId: number;
  colorFlorNombre?: string;
  tipoFlorNombre?: string;
  imagenUrl?: string | null;
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
  /**
   * Cómo se reparte la cantidad entre colores. Un ramo de un solo color es una lista de una
   * entrada. **Todos los colores deben ser de la misma especie**, si no el back responde 400.
   */
  colores: { colorFlorId: number; cantidad: number }[];
  /** Repetir la misma entrada por cada unidad: dos veces `{accesorioId:3}` = 2 unidades. */
  accesorios: { accesorioId: number }[];
  listones: IListonRequest[];
  lugarEntregaId?: number;
  recogerEnLocal?: boolean;
}

export interface IColorCalculado {
  colorFlorId: number;
  colorNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  varianteId: number;
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
  /** Una línea por color elegido, cada una con su `varianteId` para armar el pedido. */
  coloresCalculados: IColorCalculado[];
  papelObligatorioAplicado: boolean;
  precioPapel: number;
  papelVarianteId: number | null;
  accesoriosCalculados: (IRamoAccesorioCalculado & { agregadoAutomaticoPorRegla: boolean; varianteId: number })[];
  subtotalAccesorios: number;
  listonesCalculados: (IListonCalculado & { varianteId?: number | null })[];
  subtotalListones: number;
  /** Si es `true`, el `total` es PROVISIONAL: falta el precio de la frase personalizada. */
  tieneListonPendienteValidacion: boolean;
  /**
   * Texto de política de negocio — mostrar **tal cual**, no reescribir.
   *
   * ⚠️ A propósito NO trae ningún monto: al cotizar todavía no existe nada que cobrar. El monto
   * real del anticipo nace después, cuando el admin le pone precio a la frase, y vive únicamente
   * en la respuesta de `validar-frase`. (El viejo `montoAnticipoSugerido` era un número inventado
   * —50% del ramo completo— y el back lo eliminó.)
   */
  avisoFrasePendiente: string | null;
  recogerEnLocal: boolean;
  /** `null` si todavía no se eligió lugar ni recoger en local; no cuenta en el total. */
  costoEnvio: number | null;
  envioVarianteId: number | null;
  total: number;
}

// ── Ticket de producción del ramo + validación de la frase ───────────────────

/**
 * `POST /v1/flores/pedidos/{pedidoId}/detalle` — se llama DESPUÉS de `savePedido`.
 *
 * Solo hace falta cuando hay algo que guardar que no está ya en las líneas del pedido: frase,
 * zona de entrega, contacto distinto al del perfil, o el comentario de accesorio no disponible.
 * Si no hay nada de eso se puede omitir: el pedido ya quedó cobrado y válido sin este ticket.
 */
export interface IRamoPedidoDetalleRequest {
  ramoArmadoId?: number | null;
  colores: { colorFlorId: number; cantidad: number }[];
  /** Uno u otro, nunca los dos. */
  fraseListonPredefinidaId?: number | null;
  fraseListonPersonalizada?: string | null;
  lugarEntregaId?: number | null;
  recogerEnLocal?: boolean;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  comentarioAccesorioNoDisponible?: string | null;
}

export interface IRamoPedidoDetalle extends IRamoPedidoDetalleRequest {
  id: number;
  pedidoId: number;
  fraseListonEstado?: string;
}

/** Fila de la bandeja de frases por aprobar (`GET /v1/flores/pedidos/frases-pendientes`). */
export interface IFrasePendiente {
  /** El id que se manda a `validar-frase` — NO es el del pedido. */
  detalleId: number;
  pedidoId: number;
  fraseTexto: string;
  clienteNombre: string;
  fechaPedido: string;
}

export interface IFrasesPendientesPaginable {
  t: IFrasePendiente[];
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export interface IValidarFraseRequest {
  aprobar: boolean;
  precioAsignado?: number;
  anticipoPagado?: boolean;
}

/**
 * Al aprobar, el back crea solo un **pedido APARTADO nuevo y separado** (mismo cliente, una sola
 * línea: esa frase) y devuelve su id. El anticipo se cobra con el módulo de abonos de siempre:
 * `POST /v1/abonos/{pedidoAnticipoId}`.
 */
export interface IValidarFraseResponse {
  pedidoAnticipoId: number | null;
  montoAnticipo: number | null;
}
