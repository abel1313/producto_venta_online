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
  /**
   * Lo que se le cobra al cliente por flor. **Incluye la mano de obra** — decisión del dueño:
   * en vez de un campo aparte, mete su trabajo aquí (ej. $10 de flor + $15 de trabajo = $25).
   * Así escala solo con el tamaño del ramo, sin necesidad de modelar nada.
   */
  precioPorFlor: number;
  /**
   * Lo que a él le cuesta la flor (solo el material). No se le muestra al cliente ni entra en
   * ningún cálculo de venta: sirve para que el sistema saque el margen, igual que con cualquier
   * otro producto — el back lo sincroniza al producto sombra de cada color y de ahí lo leen los
   * reportes de ganancia.
   */
  precioCosto?: number | null;
  activo: boolean;
}

/**
 * Un **color vendible** de una especie (ej. "Rosa eterna" + "Rojo").
 *
 * Tiene stock propio y su propia variante interna, pero **hereda el precio y las cantidades
 * válidas de la especie** — por eso no lleva `precioPorFlor` ni tabla propia. Es lo que permite
 * armar un ramo mezclando colores sin duplicar la configuración por cada uno.
 */
/**
 * El **producto interno** que el back crea por cada color, accesorio y frase de listón.
 *
 * No se vende por su cuenta (va marcado `esCatalogoInterno`, por eso no sale en la tienda ni en
 * los buscadores), pero es lo que permite que un ramo se cobre con el flujo normal de pedidos.
 *
 * ⚠️ Para el front tiene un segundo uso: **es donde viven las fotos**. Los artículos de flores no
 * tienen campo de imagen propio, así que la foto se guarda en este producto interno y se lee con
 * `GET /tienda/v1/imagenes/{id}`, igual que la de cualquier producto.
 *
 * Opcional a propósito: es un objeto anidado de otra tabla, y un acceso directo con un solo
 * renglón en `null` tira `TypeError` a media `*ngFor` y borra el resto de la lista.
 */
export interface IVarianteSombra {
  id: number;
  producto?: { id: number };
  color?: string | null;
  descripcion?: string | null;
  talla?: string | null;
  presentacion?: string | null;
  marca?: string | null;
  contenidoNeto?: string | null;
  stock?: number;
}

export interface IColorFlor {
  id: number;
  /** Opcional por la misma razón que en `ICantidadFlor`: objeto anidado de otra tabla. */
  tipoFlor?: ITipoFlor;
  nombre: string;
  stock: number;
  activo: boolean;
  /** Producto interno del color — de aquí salen sus fotos. Ver `IVarianteSombra`. */
  variante?: IVarianteSombra;
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
  /**
   * Cuántos pliegos de papel lleva un ramo de esta cantidad. Lo pone el dueño a mano — el papel
   * NO es proporcional a las flores (depende de cómo se arma el ramo y del tamaño del pliego),
   * por eso es un número explícito y no una división.
   *
   * `null` = todavía no se sabe, y es el estado normal durante un buen rato: el dueño lo va
   * llenando conforme arma ramos reales y cuenta los pliegos que gastó. Con `null`, el back cae
   * a la fórmula `AccesorioRamo.floresPorPliego` si está configurada, y si tampoco, al precio
   * fijo de siempre. Si tiene valor, **gana sobre la fórmula**.
   */
  pliegos: number | null;
  /**
   * Cuánto se cobra por armar un ramo de este tamaño (uno de 62 da más trabajo que uno de 20).
   *
   * ⚠️ **Nunca se le muestra al cliente como línea aparte** — decisión del dueño: *"que vaya todo
   * junto"*. El back ya lo suma dentro de `total`; lo devuelve en `precioManoDeObra` solo de
   * forma informativa, para admin o reportes. `null` = todavía sin configurar.
   */
  manoDeObra: number | null;
  /**
   * Mínimo de horas entre "ahora" y la entrega para poder armar un ramo de este tamaño (sin
   * contar la zona, que suma aparte con `LugarEntrega.horasExtraAnticipacion`).
   *
   * Es lo que **bloquea** un pedido imposible: un ramo de 100 flores para mañana no se puede.
   * `null` = sin restricción de tiempo para este tamaño.
   */
  // ── Configuración de entrega (agregada por el back 2026-08-14) ────────────
  //
  // Cuánto tarda en armar un ramo de este tamaño y a qué hora lo entrega. Con esto,
  // `POST /v1/flores/fechas-disponibles` puede decirle al cliente qué fechas puede elegir, en vez
  // de dejarlo pedir algo imposible y rechazarlo después.
  //
  // ⚠️ Las horas viajan como `HH:mm:ss` ("16:00:00"), pero un `<input type="time">` solo entiende
  // `HH:mm` — hay que recortar al leer y volver a completar al guardar (ver `ConfigEntregasComponent`).
  /** Días que tarda sin prisa. `null` = ese tamaño todavía no tiene plazo configurado. */
  diasNormal: number | null;
  horaEntregaNormal: string | null;
  /**
   * Todo el bloque urgente es opcional: si viene `null`, ese tamaño **no se puede apurar** por
   * ningún motivo y al cliente no se le muestra el botón de urgente.
   */
  diasUrgente: number | null;
  horaEntregaUrgente: string | null;
  /**
   * Hora límite para pedir Y PARA PAGAR. Si el pago se pasa de esta hora, el pedido se recotiza
   * con el cargo urgente — por eso hay que llamar `revalidar-antes-de-pagar` antes del abono.
   */
  horaLimitePedido: string | null;
  cargoUrgente: number | null;
  horasMinimasAnticipacion: number | null;
  /**
   * Lo que se cobra de más cuando el ramo se pide **de un día para otro**. Un monto que el dueño
   * configura por tamaño, no un cálculo.
   *
   * ⚠️ No confundir con `horasMinimasAnticipacion`: esa decide si **se puede**; esta, si **se
   * cobra extra**. Un ramo que no se puede en ese plazo se rechaza, no se cobra más caro.
   */
  precioUrgencia: number | null;
  activo: boolean;
}

export interface ICantidadFlorRequest {
  id?: number;
  tipoFlor: { id: number };
  cantidad: number;
  pliegos: number | null;
  manoDeObra: number | null;
  horasMinimasAnticipacion: number | null;
  precioUrgencia: number | null;
  diasNormal: number | null;
  horaEntregaNormal: string | null;
  diasUrgente: number | null;
  horaEntregaUrgente: string | null;
  horaLimitePedido: string | null;
  cargoUrgente: number | null;
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
  /**
   * Solo aplica al accesorio marcado `esPapel=true`. Configurado, `precio` deja de ser un monto
   * fijo y pasa a significar **precio por pliego** — el costo real se calcula como
   * `ceil(cantidadFlores / floresPorPliego) × precio` (un pliego empezado se cobra completo).
   * `null` = comportamiento de antes, precio fijo único sin importar la cantidad.
   */
  floresPorPliego: number | null;
  /**
   * Cuántos pliegos cobrar cuando la cantidad del ramo NO está registrada en `cantidades-flor`.
   * Solo aplica al accesorio marcado `esPapel`.
   *
   * Prioridad que usa el back para decidir los pliegos:
   * 1. `CantidadFlorValida.pliegos` (si esa cantidad exacta existe)
   * 2. la fórmula `floresPorPliego`
   * 3. **este campo** — respaldo para cualquier cantidad suelta
   * 4. si nada está configurado: precio fijo único, como antes
   */
  pliegosPorDefecto: number | null;
  activo: boolean;
  /** Producto interno del accesorio — de aquí salen sus fotos. Ver `IVarianteSombra`. */
  variante?: IVarianteSombra;
}

export interface IFraseListon {
  id: number;
  texto: string;
  precio: number;
  activo: boolean;
  /** Producto interno de la frase — de aquí salen sus fotos. Ver `IVarianteSombra`. */
  variante?: IVarianteSombra;
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
  /**
   * Link de texto que el admin pegaba a mano. **Se mantiene** por retrocompatibilidad, pero ya no
   * es la única forma: ver `varianteId`. Sirve de respaldo para los ramos viejos.
   */
  imagenUrl?: string | null;
  /**
   * Variante sombra del **ramo completo** — el mismo mecanismo que los colores y accesorios, pero
   * para el ramo ya armado. Es donde viven sus fotos reales (varias, no una sola).
   *
   * ⚠️ **`null` en los ramos guardados antes de esta función**: la variante se crea sola en el
   * siguiente `PUT` sobre ese ramo. Mientras tanto hay que caer a `imagenUrl`.
   *
   * ⚠️ No confundir con `colorFlorVarianteId`, que es la variante del *color de flor*.
   */
  varianteId?: number | null;
  /** Producto detrás de esa variante — `guardarConImagenes` lo exige siempre, aun al actualizar. */
  varianteProductoId?: number | null;
  cantidad: number;
  precioFlores: number;
  /** Lo calcula el back solo cuando `cantidad > 10` — el front no lo manda ni lo agrega. */
  papelIncluido: boolean;
  precioPapel: number;
  /**
   * Cuántos pliegos se cobraron y el precio por pliego exacto — `null` si no aplicó papel o si
   * el accesorio no tiene `floresPorPliego` configurado (comportamiento de precio fijo de antes).
   * `precioPapel` sigue siendo el total ya multiplicado, no hace falta recalcularlo.
   */
  pliegosPapel: number | null;
  precioUnitarioPapel: number | null;
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

/**
 * `POST /v1/flores/fechas-disponibles` — público.
 *
 * Le pregunta al taller **desde cuándo** puede entregar ese tamaño, para que el cliente solo
 * pueda elegir fechas que sí se van a cumplir, en vez de pedir algo imposible y que se le
 * rechace después.
 *
 * `tipoFlorId` es obligatorio aunque parezca redundante: los tamaños se configuran por
 * (especie, cantidad), así que sin la especie no hay contra qué catálogo hacer el redondeo.
 */
export interface IFechasDisponiblesRequest {
  tipoFlorId: number;
  cantidad: number;
  lugarEntregaId?: number | null;
  /** `true` para preguntar por el plazo apurado. El cargo viene en `cargoUrgencia`. */
  urgente: boolean;
}

export interface IFechasDisponiblesResponse {
  /**
   * Lo antes que se puede entregar, ISO `LocalDateTime`. **`null` = no se puede pedir** — ahí
   * `mensaje` trae el texto para el cliente (que contacte por WhatsApp). Pasa cuando piden más
   * que el tamaño máximo configurado, o `urgente` en un tamaño que no se puede apurar.
   */
  primeraFechaValida: string | null;
  /** Las horas a las que el taller entrega ese tamaño, `HH:mm`. */
  horasDisponibles: string[] | null;
  /** El tamaño del que se tomaron los plazos — puede no ser el pedido: 37 se maneja como 48. */
  cantidadAplicada: number;
  cargoUrgencia: number | null;
  ofreceUrgente: boolean;
  mensaje: string | null;
}

/** Cada entrada es UN listón: o frase predefinida, o personalizada. Nunca las dos ni ninguna. */
export interface IListonRequest {
  fraseListonPredefinidaId?: number;
  fraseListonPersonalizada?: string;
}

export interface ICalcularPrecioRequest {
  /**
   * Cuándo la quiere el cliente. Opcional: **sin este campo no se valida el tiempo ni se cobra
   * urgencia**, y todo se comporta como antes.
   *
   * Formato ISO `LocalDateTime` (`2026-08-20T12:00:00`). Se vuelve a mandar después en
   * `guardarDetalleRamo` — el back no confía en lo ya cotizado y revalida en el servidor.
   */
  fechaHoraEntrega?: string | null;
  /**
   * `true` cuando el cliente eligió la entrega urgente en el calendario — el mismo valor que se
   * mandó a `fechas-disponibles` para obtener esa fecha.
   *
   * ⚠️ **Sin este flag no se cobra el cargo urgente ni se marca `requiereAnticipo`**, aunque el
   * tamaño sí tenga plazo urgente configurado. O sea: el ramo se entregaría en la fecha apurada
   * pero cobrado como normal, y de contado en vez de con el 50% de enganche.
   */
  urgente?: boolean;
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
  /**
   * Cuántos pliegos se cobraron y el precio por pliego exacto — `null` si no aplicó papel o el
   * accesorio no tiene `floresPorPliego` configurado. ⚠️ Al armar la línea real de
   * `POST /v1/pedidos/savePedido` para `papelVarianteId`, hay que mandar
   * `cantidad = pliegosPapel ?? 1` y `precioUnitario = precioUnitarioPapel ?? precioPapel` —
   * NUNCA `precioUnitario = precioPapel` cuando `pliegosPapel` no es null, porque el back valida
   * que coincida exacto con el precio de catálogo (que es el precio *por pliego*, no el total).
   */
  pliegosPapel: number | null;
  precioUnitarioPapel: number | null;
  papelVarianteId: number | null;
  /**
   * ⚠️ **Informativo — NO mostrárselo al cliente.** Ya viene sumado dentro de `total`; existe
   * solo por si se arma una pantalla de admin o un reporte. El cliente ve un precio de ramo, sin
   * desglose de mano de obra.
   */
  precioManoDeObra: number | null;
  /**
   * `false` cuando no da tiempo de armar el ramo para la fecha/hora pedida (contando la zona).
   * El resto de la respuesta viene calculado igual, para poder seguir mostrando el precio
   * mientras el cliente corrige la fecha — pero **el pedido no se debe poder generar**.
   */
  entregaValida?: boolean;
  /** El motivo, cuando `entregaValida` es `false`. Mostrarlo tal cual. */
  mensajeEntrega?: string | null;
  /**
   * Lo que se cobra de más por ser de un día para otro. Ya sumado en `total`.
   * ⚠️ **Sin línea aparte para el cliente**, mismo criterio que `precioManoDeObra`.
   */
  precioUrgencia?: number | null;
  /**
   * `true` cuando aplicó `precioUrgencia`. Es la señal para crear el pedido como **APARTADO**
   * (`tipoPedido: 'APARTADO'` en `savePedido`) en vez de cobrarlo completo.
   */
  requiereAnticipo?: boolean;
  /**
   * El 50% de `total` (envío incluido) que el cliente paga como enganche.
   *
   * ⚠️ **No es dinero adicional**: sale del total. Ej. ramo $960 → paga $480 ahora y $480 al
   * entregar. Se registra con `POST /v1/abonos/{pedidoId}`, el flujo de crédito de siempre.
   */
  montoAnticipoSugerido?: number | null;
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
  /**
   * `colorNombre` solo viene en la RESPUESTA, y es importante: se lee de la relación guardada en
   * el pedido, **no del catálogo activo**. Es la única forma de saber cómo se llamaba un color
   * que se desactivó después de la venta — cruzarlo contra `colores-flor/por-tipo-flor` no sirve,
   * porque ese endpoint filtra por `activo:true` y el color caído simplemente no aparece.
   */
  colores: { colorFlorId: number; cantidad: number; colorNombre?: string }[];
  /** Uno u otro, nunca los dos. */
  fraseListonPredefinidaId?: number | null;
  fraseListonPersonalizada?: string | null;
  lugarEntregaId?: number | null;
  recogerEnLocal?: boolean;
  // Ubicación exacta (2026-08-22) — se reenvían aquí los mismos valores ya mandados en
  // savePedido: esta llamada toca campos de entrega del pedido (lugarEntregaId, fecha), así
  // que por seguridad se reafirman también estos para que no queden en blanco si el back
  // los trata como parte del mismo bloque de "datos de entrega".
  latitud?: number | null;
  longitud?: number | null;
  referencias?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  comentarioAccesorioNoDisponible?: string | null;
  /**
   * Los mismos dos valores que se usaron al cotizar. Con ellos el back **guarda** la
   * `fechaLimitePago` y el `cargoUrgenteMonto` en ese momento, y ya no depende de que el front
   * vuelva a mandar nada — es lo que después consulta `revalidar-antes-de-pagar`.
   */
  fechaHoraEntrega?: string | null;
  urgente?: boolean;
}

export interface IRamoPedidoDetalle extends IRamoPedidoDetalleRequest {
  id: number;
  pedidoId: number;
  fraseListonEstado?: string;
  /** Especie del ramo — viene explícito, no hay que deducirlo de `colores[]`. */
  tipoFlorId?: number;
  tipoFlorNombre?: string;
  /** Total de flores ya sumado. */
  cantidadFinal?: number;
  /** Los accesorios elegidos, SIN el papel (ése no es una elección del cliente). */
  accesorios?: { accesorioId: number; accesorioNombre: string; cantidad: number }[];
  /** Se guardaron al cotizar; los usa `revalidar-antes-de-pagar`. */
  esUrgente?: boolean;
  fechaLimitePago?: string | null;
  cargoUrgenteMonto?: number | null;
}

/**
 * `PUT /v1/flores/pedidos/{pedidoId}/editar-ramo` — **solo ADMIN**.
 *
 * Reemplaza (no suma) los colores y accesorios de un ramo ya guardado y lo recotiza.
 *
 * ⚠️ **No cubre envío ni listón** — cambiarlos abre reglas propias (costo de envío ya cobrado,
 * aprobación de frase con su precio) que el back dejó fuera a propósito. En modo edición esos dos
 * pasos van en solo lectura, o el admin creería que los cambió y se perderían en silencio.
 */
export interface IEditarRamoRequest {
  /** Obligatorio, al menos uno. Reemplaza TODOS los colores. Todos de la misma especie. */
  colores: { colorFlorId: number; cantidad: number }[];
  /** Una entrada por unidad (2 coronas = 2 entradas). **Nunca incluir el papel** — se recalcula solo. */
  accesorios?: { accesorioId: number }[];
  /**
   * Opcionales y retrocompatibles: omitirlos deja la fecha del pedido intacta. Si se mandan, el
   * back recalcula la hora límite de pago y el cargo urgente — pero **no revalida el calendario**,
   * así que hay que llamar `fechas-disponibles` primero y mandar lo que ya se validó ahí.
   */
  fechaHoraEntrega?: string | null;
  urgente?: boolean;
}

export interface IEditarRamoResponse {
  ramo: IRamoPedidoDetalle;
  totalPedidoAnterior: number;
  totalPedidoNuevo: number;
  /**
   * `nuevo - anterior`. **Positiva → el cliente debe pagar la diferencia** (se registra con
   * `POST /v1/abonos/{pedidoId}`). Negativa o cero → no se genera reembolso ni ajuste; de hecho
   * el back rechaza con 400 cualquier edición que deje el total por debajo de lo ya pagado.
   */
  diferencia: number;
}

/**
 * `POST /v1/flores/pedidos/{pedidoId}/revalidar-antes-de-pagar` — autenticado, sin body.
 *
 * Se llama **antes** de `POST /v1/abonos/{pedidoId}`: si el pago de un ramo urgente llega después
 * de la hora límite, el back agrega el cargo al pedido y devuelve el total ya actualizado. Es
 * idempotente — llamarlo dos veces no vuelve a cobrar.
 *
 * **Se puede llamar en CUALQUIER pedido**, no solo de flores: para los demás responde 200 con
 * `cargoRecienAplicado: false` y el total tal cual (así lo dejó el back a petición nuestra, para
 * no tener que adivinar de antemano qué pedido es de flores). Solo un pedido inexistente da error.
 */
export interface IRevalidarPagoResponse {
  /** `true` = el total cambió y hay que cobrar `totalActual`, no lo que se tenía calculado. */
  cargoRecienAplicado: boolean;
  cargoAgregado: number | null;
  totalActual: number;
  mensaje: string | null;
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
