/**
 * Catálogo de ayudas contextuales del admin (pedido 2026-09-17).
 *
 * Motivo: pantallas con nombres parecidos ("Agregar Modelo" vs "Nuevo Producto",
 * "Promociones" vs "Gestión de promociones", "Entregas" vs "Lugares de entrega") no dejaban
 * claro cuál usar, y el usuario tenía que entrar a probar para acordarse. Cada entrada
 * responde las cuatro preguntas que causaban la duda: qué es, cuándo se usa, en qué se
 * diferencia de la pantalla parecida, y por qué está hecha así.
 *
 * `diferencia` es el campo importante: solo se llena cuando existe otra pantalla con la que
 * de verdad se confunde. Si no hay confusión posible, se deja fuera.
 */
export interface AyudaPantalla {
  /** Ruta tal cual aparece en el routerLink del navbar (sin slash inicial). */
  ruta: string;
  titulo: string;
  /** Qué es esta pantalla, en una frase. */
  queEs: string;
  /** Cuándo se usa / qué se logra aquí. */
  paraQue: string[];
  /** En qué se diferencia de la(s) pantalla(s) con la que se confunde. */
  diferencia?: { pantalla: string; explicacion: string }[];
  /** Por qué está hecha así (decisiones que no son obvias viendo la pantalla). */
  porQue?: string;
}

/**
 * Taxonomía que atraviesa todo el catálogo (fijada 2026-09-05):
 *   MODELO   = el artículo base, sin talla ni color. Ej. "Blusa Zara". No se vende solo.
 *   PRODUCTO = lo que sí se vende: un modelo con su talla y color. Ej. "Blusa Zara / M / negro".
 * Un modelo puede tener muchos productos colgando. Esta es la confusión #1 del admin.
 */
export const AYUDAS_PANTALLAS: AyudaPantalla[] = [

  // ─── Catálogo ──────────────────────────────────────────────────────────────
  {
    ruta: 'productos/agregar',
    titulo: 'Agregar Modelo',
    queEs: 'Da de alta el artículo base del catálogo: el modelo, sin talla ni color todavía.',
    paraQue: [
      'Registrar un artículo nuevo que aún no existe en el sistema (ej. «Blusa Zara»).',
      'Definir lo que no cambia entre tallas: nombre, marca, precios, descripción y categoría.',
      'Es el paso 1 de 2 — el modelo por sí solo todavía no se puede vender.',
    ],
    diferencia: [{
      pantalla: 'Nuevo Producto (Tienda › Venta)',
      explicacion: 'Allá se crea lo que SE VENDE (el modelo ya con talla y color). Aquí se crea el ' +
        'modelo base. Primero pasas por esta pantalla, después por aquella. Si el modelo ya existe, ' +
        'sáltate esta pantalla y ve directo a «Nuevo Producto».',
    }],
    porQue: 'Se separó en dos pantallas porque un mismo modelo suele tener muchas combinaciones de ' +
      'talla y color. Si se capturara todo junto, habría que reescribir nombre, marca y precios en ' +
      'cada talla.',
  },
  {
    ruta: 'tienda/venta',
    titulo: 'Nuevo Producto',
    queEs: 'Crea lo que realmente se vende: un modelo ya con su talla, color y stock.',
    paraQue: [
      'Darle tallas y colores a un modelo que ya existe en el catálogo.',
      'Cargarle stock e imágenes propias a esa combinación.',
      'Es el paso 2 de 2 — a partir de aquí el artículo ya aparece en la tienda.',
    ],
    diferencia: [{
      pantalla: 'Agregar Modelo (Catálogo)',
      explicacion: 'Allá se crea el artículo base (el modelo). Aquí se le cuelgan las variantes que ' +
        'se venden. Por eso el primer campo de esta pantalla es un buscador: el modelo tiene que ' +
        'existir antes.',
    }],
    porQue: 'El único campo obligatorio es el modelo; talla y color son opcionales porque hay ' +
      'artículos de talla única que igual necesitan venderse.',
  },
  {
    ruta: 'productos/buscar',
    titulo: 'Buscar Modelos',
    queEs: 'Listado de los modelos del catálogo, para consultarlos o editarlos.',
    paraQue: [
      'Encontrar un modelo por nombre o código de barras.',
      'Entrar a editar sus datos base o ver qué productos tiene colgando.',
    ],
    diferencia: [{
      pantalla: 'Buscar en Tienda',
      explicacion: 'Aquí ves modelos (el artículo base). Allá ves los productos vendibles, ya con ' +
        'talla y color.',
    }],
  },
  {
    ruta: 'carga-imagenes',
    titulo: 'Carga de imágenes',
    queEs: 'Sube o reemplaza las fotos de los artículos en lote.',
    paraQue: [
      'Cargar varias fotos de una sesión sin entrar artículo por artículo.',
      'Reemplazar fotos viejas o de mala calidad.',
    ],
    porQue: 'Las imágenes se redimensionan al subirlas: el original pesa de más y el cliente paga ' +
      'esos datos al abrir la tienda desde el celular.',
  },
  {
    ruta: 'tienda/cargar-excel',
    titulo: 'Cargar Excel',
    queEs: 'Alta masiva de artículos desde una hoja de cálculo.',
    paraQue: [
      'Cargar un pedido completo de proveedor de una sola vez.',
      'Evitar capturar a mano decenas de artículos.',
    ],
    diferencia: [{
      pantalla: 'Agregar Modelo / Nuevo Producto',
      explicacion: 'Esas son de uno en uno. Esta es para muchos a la vez, pero exige que el Excel ' +
        'venga con el formato exacto.',
    }],
  },
  {
    ruta: 'palabras-clave',
    titulo: 'Palabras clave',
    queEs: 'Sinónimos que el chatbot usa para entender lo que pide el cliente.',
    paraQue: [
      'Que «pants» encuentre los pantalones aunque el catálogo no use esa palabra.',
      'Corregir búsquedas que no devuelven nada pero deberían.',
    ],
    porQue: 'El chatbot busca en el catálogo con las palabras del cliente. Sin sinónimos, ' +
      'contesta «no tengo» sobre algo que sí está en existencia.',
  },

  // ─── Envíos ────────────────────────────────────────────────────────────────
  {
    ruta: 'lugares-entrega',
    titulo: 'Lugares de entrega',
    queEs: 'Catálogo de los puntos donde se entregan pedidos.',
    paraQue: [
      'Dar de alta un punto de encuentro nuevo con su ubicación en el mapa.',
      'Habilitar o deshabilitar puntos según la temporada.',
    ],
    diferencia: [{
      pantalla: 'Entregas por zona',
      explicacion: 'Aquí defines los lugares (el catálogo). Allá ves los pedidos que hay que ' +
        'entregar en esos lugares, filtrados por fecha.',
    }],
  },
  {
    ruta: 'entregas-zona',
    titulo: 'Entregas por zona',
    queEs: 'Los pedidos por entregar, agrupados por zona y rango de fechas.',
    paraQue: [
      'Armar la ruta del día: ver qué se entrega, dónde y a quién.',
      'Filtrar por zona para no mezclar entregas de rumbos distintos.',
    ],
    porQue: 'Incluye los pedidos en estado APARTADO además de los confirmados, porque un apartado ' +
      'con fecha de entrega también hay que llevarlo.',
  },

  // ─── Pedidos ───────────────────────────────────────────────────────────────
  {
    ruta: 'pedidos/mis-pedidos',
    titulo: 'Pedidos',
    queEs: 'Todos los pedidos con su estado, para darles seguimiento.',
    paraQue: [
      'Ver qué pedidos están pendientes, apartados, entregados o cancelados.',
      'Cambiar el estado de un pedido y registrar su entrega.',
    ],
  },
  {
    ruta: 'pedidos/historial-mp',
    titulo: 'Historial Mercado Pago',
    queEs: 'Los pagos en línea recibidos, tal como los reporta Mercado Pago.',
    paraQue: [
      'Confirmar que un pago entró antes de liberar el pedido.',
      'Conciliar contra lo que muestra el panel de Mercado Pago.',
    ],
    diferencia: [{
      pantalla: 'Abonos',
      explicacion: 'Aquí ves pagos en línea (los cobra Mercado Pago). Allá registras pagos que ' +
        'recibiste tú, en efectivo o transferencia.',
    }],
  },

  // ─── Ventas ────────────────────────────────────────────────────────────────
  {
    ruta: 'tienda/venta-directa',
    titulo: 'Venta directa',
    queEs: 'Cobro en mostrador: se arma la venta y se descuenta el stock en el momento.',
    paraQue: [
      'Vender a alguien que está físicamente ahí, sin pasar por el carrito de la tienda.',
      'Cobrar y generar el ticket de una vez.',
    ],
    diferencia: [{
      pantalla: 'Pedidos',
      explicacion: 'Un pedido nace en la tienda en línea y pasa por estados hasta entregarse. Una ' +
        'venta directa se cobra y se cierra en el mismo momento.',
    }],
  },
  {
    ruta: 'abonos',
    titulo: 'Abonos',
    queEs: 'Pagos parciales de un cliente que va liquidando poco a poco.',
    paraQue: [
      'Registrar lo que un cliente abonó a cuenta de un apartado.',
      'Ver cuánto lleva pagado y cuánto le falta.',
    ],
  },
  {
    ruta: 'gastos/buscar',
    titulo: 'Gastos',
    queEs: 'El dinero que sale: compras a proveedor, envíos, servicios.',
    paraQue: [
      'Registrar un gasto para que la utilidad de los reportes sea real.',
      'Consultar en qué se fue el dinero en un periodo.',
    ],
    porQue: 'Sin gastos capturados, los reportes muestran ingresos y no ganancia.',
  },

  // ─── Reportes ──────────────────────────────────────────────────────────────
  {
    ruta: 'dashboard',
    titulo: 'Dashboard',
    queEs: 'Resumen rápido del estado del negocio hoy.',
    paraQue: [
      'Ver de un vistazo ventas, pedidos pendientes y movimiento reciente.',
    ],
    diferencia: [{
      pantalla: 'Reportes',
      explicacion: 'El dashboard es el panorama de ahora. Los reportes son para analizar un ' +
        'periodo que tú eliges.',
    }],
  },
  {
    ruta: 'reportes',
    titulo: 'Reportes de ventas',
    queEs: 'Análisis de ventas por periodo, con lo vendido y lo gastado.',
    paraQue: [
      'Comparar meses y ver qué se movió mejor.',
      'Sacar la utilidad real de un periodo.',
    ],
  },

  // ─── Rifas ─────────────────────────────────────────────────────────────────
  {
    ruta: 'rifas/agregar',
    titulo: 'Agregar rifa',
    queEs: 'Crea una rifa nueva: premios, fechas y cómo se sortea.',
    paraQue: [
      'Configurar los premios (productos que ya tienes en catálogo con stock).',
      'Definir la fecha del sorteo y el tipo de rifa.',
    ],
    porQue: 'Solo deja elegir como premio productos con stock, imagen y habilitados: un premio sin ' +
      'foto no se puede mostrar en la ruleta pública.',
  },
  {
    ruta: 'rifas/mes',
    titulo: 'Rifa del mes',
    queEs: 'La rifa que está corriendo ahora mismo y su ruleta.',
    paraQue: [
      'Ver los participantes y sus boletos.',
      'Girar la ruleta para sacar al ganador.',
    ],
    diferencia: [{
      pantalla: 'Buscar rifa',
      explicacion: 'Aquí ves la rifa activa. Allá consultas rifas pasadas y sus ganadores.',
    }],
  },
  {
    ruta: 'rifas/buscar',
    titulo: 'Buscar rifa',
    queEs: 'Historial de rifas: las que ya se sortearon y las programadas.',
    paraQue: [
      'Consultar quién ganó una rifa anterior.',
      'Editar una rifa que todavía no se sortea.',
    ],
  },
  {
    ruta: 'rifas/boletos',
    titulo: 'Boletos',
    queEs: 'Los boletos emitidos y a qué cliente pertenece cada uno.',
    paraQue: [
      'Verificar que a un cliente se le asignaron sus boletos.',
      'Resolver reclamos sobre boletos.',
    ],
  },

  // ─── Flores eternas ────────────────────────────────────────────────────────
  {
    ruta: 'flores/ramos',
    titulo: 'Ramos',
    queEs: 'Los pedidos de ramos que hay que preparar.',
    paraQue: ['Ver qué ramos están pendientes y con qué configuración los pidieron.'],
    diferencia: [{
      pantalla: 'Administrar ramos',
      explicacion: 'Aquí ves los pedidos de ramos. Allá defines los ramos que se pueden pedir.',
    }],
  },
  {
    ruta: 'flores/configurar',
    titulo: 'Configurar ramo',
    queEs: 'Las opciones que el cliente puede elegir al armar su ramo.',
    paraQue: ['Definir tamaños, tipos de flor y envolturas disponibles.'],
  },
  {
    ruta: 'flores/catalogos',
    titulo: 'Catálogos de flores',
    queEs: 'Las flores y materiales con los que se arman los ramos.',
    paraQue: ['Dar de alta flores nuevas o quitar las que ya no manejas.'],
  },
  {
    ruta: 'flores/entregas',
    titulo: 'Entregas de flores',
    queEs: 'Las entregas programadas de ramos, con su fecha y destinatario.',
    paraQue: ['Organizar las entregas del día, que en flores suelen ser a domicilio y con hora.'],
  },
  {
    ruta: 'flores/ramos-admin',
    titulo: 'Administrar ramos',
    queEs: 'Los ramos armados que se ofrecen en la vitrina.',
    paraQue: ['Publicar, editar o retirar un ramo del catálogo público.'],
  },
  {
    ruta: 'flores/frases',
    titulo: 'Frases',
    queEs: 'Las dedicatorias sugeridas que el cliente puede elegir para su tarjeta.',
    paraQue: ['Ofrecerle frases ya escritas al cliente que no sabe qué poner.'],
  },

  // ─── Marketing ─────────────────────────────────────────────────────────────
  {
    ruta: 'promociones',
    titulo: 'Promociones',
    queEs: 'Las promociones activas tal como las ve el cliente en la tienda.',
    paraQue: ['Revisar cómo le llega la promoción al cliente.'],
    diferencia: [{
      pantalla: 'Gestión de promociones (Admin)',
      explicacion: 'Esta es la vista del cliente. Para crear o editar promociones usa la de admin.',
    }],
  },
  {
    ruta: 'admin/promociones',
    titulo: 'Gestión de promociones',
    queEs: 'Alta y edición de promociones: descuentos, vigencias y a qué aplican.',
    paraQue: [
      'Crear una promoción nueva con su vigencia.',
      'Activar o desactivar promociones sin borrarlas.',
    ],
  },
  {
    ruta: 'admin/cinta',
    titulo: 'Cinta de anuncios',
    queEs: 'La franja de texto que corre arriba en la tienda.',
    paraQue: ['Anunciar envíos gratis, horarios especiales o una promoción del día.'],
  },
  {
    ruta: 'admin/facebook',
    titulo: 'Publicar en Facebook',
    queEs: 'Publica productos del catálogo en la página de Facebook.',
    paraQue: ['Sacar un producto a la página sin volver a subir la foto y el texto a mano.'],
  },
  {
    ruta: 'admin/hashtags',
    titulo: 'Hashtags',
    queEs: 'Los hashtags que se agregan a las publicaciones de redes.',
    paraQue: ['Tener listos los hashtags de siempre para no reescribirlos en cada publicación.'],
  },

  // ─── Sistema ───────────────────────────────────────────────────────────────
  {
    ruta: 'usuarios/buscar',
    titulo: 'Usuarios',
    queEs: 'Las cuentas que pueden entrar al sistema y qué rol tiene cada una.',
    paraQue: [
      'Dar de alta a alguien del equipo.',
      'Cambiarle el rol o desactivarle el acceso.',
    ],
    diferencia: [{
      pantalla: 'Clientes',
      explicacion: 'Aquí van las cuentas del equipo (las que entran al admin). Los clientes que ' +
        'compran en la tienda se administran en su propia pantalla.',
    }],
  },
  {
    ruta: 'admin/negocio',
    titulo: 'Configuración del negocio',
    queEs: 'Los datos generales: nombre, contacto, horario y ubicación del local.',
    paraQue: [
      'Actualizar el horario o el teléfono que ve el cliente.',
      'Fijar la ubicación del local que se muestra en el mapa de login y registro.',
    ],
  },
  {
    ruta: 'admin/chat',
    titulo: 'Chat en vivo',
    queEs: 'Las conversaciones con clientes, atendidas por el bot o por una persona.',
    paraQue: [
      'Contestar a un cliente que pidió hablar con alguien.',
      'Revisar qué le contestó el bot antes de escalar.',
    ],
    porQue: 'El chat manda solo texto, sin fotos: la pantalla del cliente no las puede dibujar. ' +
      'Para enseñar un producto se pega el link y el cliente lo abre en la tienda.',
  },
  {
    ruta: 'admin/presentacion',
    titulo: 'Imágenes de presentación',
    queEs: 'Las imágenes de las pantallas de login y registro.',
    paraQue: ['Cambiar la cara con la que recibe el sistema a quien entra.'],
  },
  {
    ruta: 'admin/diagnostico-imagenes',
    titulo: 'Diagnóstico de imágenes',
    queEs: 'Revisa por qué la foto de un artículo no aparece en el listado.',
    paraQue: [
      'Saber si la imagen nunca se guardó, si se perdió el archivo, o si es la caché.',
    ],
    diferencia: [{
      pantalla: 'Reconciliación de imágenes',
      explicacion: 'Esta diagnostica UN artículo y te dice qué le pasa. Aquella repara el desfase ' +
        'entre la base de datos y los archivos, de forma masiva.',
    }],
    porQue: 'Las fotos viven en un microservicio aparte. Si la base dice que hay foto pero el ' +
      'archivo ya no está, el listado sale vacío sin avisar — esta pantalla es para distinguir cuál ' +
      'de los dos lados falló.',
  },
  {
    ruta: 'admin/reconciliacion-imagenes',
    titulo: 'Reconciliación de imágenes',
    queEs: 'Repara el desfase entre las imágenes registradas y los archivos que existen.',
    paraQue: [
      'Limpiar registros de imágenes cuyo archivo ya no está.',
      'Correrla después de detectar varios artículos sin foto.',
    ],
  },
  {
    ruta: 'admin/cache',
    titulo: 'Caché',
    queEs: 'Limpia la memoria temporal del sistema.',
    paraQue: [
      'Forzar que la tienda muestre un cambio que hiciste y no se refleja.',
      'Es el último recurso cuando algo se ve viejo pero ya lo corregiste.',
    ],
    porQue: 'El catálogo se guarda en caché para que la tienda cargue rápido. El precio es que un ' +
      'cambio recién hecho puede tardar en verse.',
  },
  {
    ruta: 'gestion-menu',
    titulo: 'Gestión de menú',
    queEs: 'Qué pantallas existen y cómo se agrupan en el menú lateral.',
    paraQue: ['Dar de alta una pantalla nueva o moverla de sección.'],
    diferencia: [{
      pantalla: 'Gestión de roles',
      explicacion: 'Aquí defines qué pantallas EXISTEN. Allá decides quién puede VERLAS.',
    }],
  },
  {
    ruta: 'gestion-menu/roles',
    titulo: 'Gestión de roles',
    queEs: 'Qué puede ver y hacer cada rol dentro del sistema.',
    paraQue: [
      'Dar o quitar acceso a pantallas completas.',
      'Distinguir entre solo ver y poder editar.',
      'Conceder permisos puntuales, como ver estas ayudas.',
    ],
    porQue: 'Los permisos viajan dentro del token de la sesión. Si le cambias los permisos a un ' +
      'rol, quien ya estaba dentro los ve aplicados hasta volver a entrar.',
  },
  {
    ruta: 'clientes/buscar',
    titulo: 'Clientes',
    queEs: 'Las personas que compran en la tienda.',
    paraQue: [
      'Consultar los datos y el historial de compras de un cliente.',
      'Registrarle una compra a nombre suyo.',
    ],
    diferencia: [{
      pantalla: 'Usuarios',
      explicacion: 'Un cliente compra en la tienda. Un usuario entra al panel de administración. ' +
        'Son cuentas distintas y no se mezclan.',
    }],
  },
  {
    ruta: 'favoritos',
    titulo: 'Favoritos',
    queEs: 'Los artículos que los clientes marcaron como favoritos.',
    paraQue: ['Ver qué está llamando la atención aunque todavía no se venda.'],
  },
];

/** Índice por ruta, para no recorrer el arreglo en cada navegación. */
const POR_RUTA = new Map<string, AyudaPantalla>(AYUDAS_PANTALLAS.map(a => [a.ruta, a]));

/**
 * Busca la ayuda de una URL de Angular (`/productos/agregar?x=1`).
 * Tolera el slash inicial, los query params y los fragmentos.
 */
export function ayudaDeRuta(url: string): AyudaPantalla | undefined {
  const limpia = url.split('?')[0].split('#')[0].replace(/^\/+/, '').replace(/\/+$/, '');
  const directa = POR_RUTA.get(limpia);
  if (directa) { return directa; }

  // Rutas con parámetro (ej. "productos/detalle/12") — se queda con la ayuda de la ruta
  // padre más larga que coincida, así el detalle hereda la ayuda de su listado.
  let mejor: AyudaPantalla | undefined;
  for (const [ruta, ayuda] of POR_RUTA) {
    if (limpia.startsWith(ruta + '/') && (!mejor || ruta.length > mejor.ruta.length)) {
      mejor = ayuda;
    }
  }
  return mejor;
}
