import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, filter, map, take, takeUntil, timeout } from 'rxjs/operators';
import Swal from 'sweetalert2';
import {
  IAccesorioRamo, ICalcularPrecioResponse, IColorFlor, IFechasDisponiblesResponse, IFraseListon,
  IListonRequest, IRamoArmado, IRamoPedidoDetalleRequest, ITipoFlor, IValidarCantidadResponse, ICantidadFlor
} from '../models/flores.model';
import { FloresService } from '../service/flores.service';
import { FloresImagenService } from '../service/flores-imagen.service';
import { AuthService } from '../../auth/auth.service';
import { UsuarioService } from '../../shared/usuario.service';
import { ClienteService } from '../../clietes/cliente.service';
import { LugarEntregaService } from '../../lugares-entrega/service/lugar-entrega.service';
import { ILugarEntrega } from '../../lugares-entrega/models/lugar-entrega.model';
import { CENTRO_MAPA_GENERICO } from '../../shared/selector-ubicacion/selector-ubicacion.component';
import { VarianteService } from '../../variante/service/variante.service';
import { IPedidoVarianteDTO, IPedidoVarianteDetalleDTO } from '../../variante/models/pedido-variante.model';

interface IAccesorioSeleccion {
  accesorio: IAccesorioRamo;
  seleccionado: boolean;
  cantidad: number;
}

interface IRepartoColor {
  color: IColorFlor;
  cantidad: number;
}

type ListonModo = 'ninguno' | 'predefinida' | 'personalizada';

/**
 * Configurador del cliente — arma su propio ramo desde cero (Flujo A), a diferencia de
 * `VitrinaFloresComponent` que solo muestra combos ya armados por el admin (Flujo B).
 *
 * Flujo: especie → validar cantidad (con sugerencias si no "cierra el círculo") → repartir esa
 * cantidad entre colores con stock → accesorios opcionales (el papel se agrega solo si la
 * cantidad ya cruza el umbral que configuró el admin) → listón opcional → cálculo de precio en
 * vivo (`POST /v1/flores/calcular-precio`) → confirmar pedido con el mismo checkout ya probado
 * que usa `venta-variante` (mismo manejo de verificación de correo / registro incompleto /
 * precio desactualizado — no se reinventa, se reutiliza tal cual).
 */
@Component({
  selector: 'app-configurar-ramo',
  templateUrl: './configurar-ramo.component.html',
  styleUrls: ['./configurar-ramo.component.scss']
})
export class ConfigurarRamoComponent implements OnInit, OnDestroy {

  // ── Catálogo base ────────────────────────────────────────────────────────
  tipos: ITipoFlor[] = [];
  accesorios: IAccesorioRamo[] = [];
  frases: IFraseListon[] = [];
  cantidades: ICantidadFlor[] = [];
  lugares: ILugarEntrega[] = [];
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;

  // ── Paso 1 — especie ─────────────────────────────────────────────────────
  tipoSeleccionadoId = 0;

  // ── Paso 2 — cantidad ────────────────────────────────────────────────────
  cantidadDeseada: number | null = null;
  validandoCantidad = false;
  resultadoValidacion: IValidarCantidadResponse | null = null;
  cantidadConfirmada: number | null = null;

  // ── Paso 3 — repartir entre colores ──────────────────────────────────────
  coloresDisponibles: IColorFlor[] = [];
  cargandoColores = false;
  reparto: IRepartoColor[] = [];

  // ── Paso 4 — accesorios ──────────────────────────────────────────────────
  seleccionAccesorios: IAccesorioSeleccion[] = [];

  // ── Paso 5 — listón ──────────────────────────────────────────────────────
  listonModo: ListonModo = 'ninguno';
  fraseSeleccionadaId = 0;
  fraseTexto = '';

  // ── Paso 6 — entrega ─────────────────────────────────────────────────────
  lugarEntregaId: number | null = null;
  recogerEnLocal = false;
  // Ubicación exacta (2026-08-22) — se ofrece el mapa solo tras elegir zona, para marcar el
  // punto dentro de esa zona (Tejupilco es extenso, "la zona" sola no dice dónde exactamente).
  latitud: number | null = null;
  longitud: number | null = null;
  referencias = '';

  onUbicacionCambio(p: { lat: number; lng: number }): void {
    this.latitud = p.lat;
    this.longitud = p.lng;
  }

  // Centro del mapa según la zona elegida — recalculado solo cuando cambia `lugarEntregaId`
  // (ver `onLugarChange`), no en cada ciclo de detección de cambios: un getter que devolviera
  // un array nuevo cada vez rompería `SelectorUbicacionComponent.ngOnChanges` (recentraría el
  // mapa en cada tecla que el cliente escriba, peleándose con que pueda mover/hacer zoom
  // libremente antes de marcar el pin). Si la zona ya tiene latitud/longitud capturada se usa
  // como centro; si no (zona vieja) se cae al genérico fijo de siempre — ver
  // CENTRO_MAPA_GENERICO en selector-ubicacion.component.ts.
  centroMapaLugar: [number, number] = CENTRO_MAPA_GENERICO;

  /** Cuándo puede entregarse este tamaño. Ver `consultarFechas()`. */
  fechas: IFechasDisponiblesResponse | null = null;
  consultandoFechas = false;
  errorFechas: string | null = null;
  urgente = false;
  fechaEntrega = '';   // yyyy-MM-dd
  horaEntrega = '';    // HH:mm

  // ── Cálculo en vivo ──────────────────────────────────────────────────────
  calculo: ICalcularPrecioResponse | null = null;
  calculando = false;
  errorCalculo: string | null = null;
  private recalcular$ = new Subject<void>();

  // ── Modo edición (admin) ─────────────────────────────────────────────────
  /**
   * Se entra con `/flores/configurar?pedidoId=42` desde "✏️ Editar ramo" (detalle del pedido).
   * La misma pantalla, precargada con lo que el cliente pidió, para que el admin cambie flores,
   * accesorios o la fecha y se **recotice** — en vez de tocar líneas sueltas sin recalcular nada.
   *
   * ⚠️ `editar-ramo` **no** cambia listón ni zona de envío: cambiarlos abre reglas propias
   * (aprobación de frase con su precio, costo de envío ya cobrado) que el back dejó fuera. Por
   * eso esos dos pasos se ocultan al editar — si se mostraran, el admin creería que los cambió
   * y se perderían en silencio al guardar.
   */
  pedidoIdEdicion: number | null = null;
  cargandoEdicion = false;
  errorEdicion: string | null = null;
  /** Lo que el pedido tenía al abrir, para poder avisar qué cambió. */
  fechaOriginal: string | null = null;
  /** Se llena cuando el cambio hizo que la fecha ya pactada dejara de alcanzar. */
  avisoFechaCorrida: string | null = null;
  /** Respaldo del reparto original: teclear una cantidad nueva vacía `reparto`. */
  private repartoPactado: Map<number, number> | null = null;
  /**
   * Colores que el cliente había pedido pero que se desactivaron después de la venta. No se pueden
   * volver a mandar, así que hay que decirle al admin **cuál y cuántas** para que pueda ofrecerle
   * un cambio — si no, solo ve "faltan N flores" sin saber de qué eran.
   */
  coloresNoDisponibles: { nombre: string; cantidad: number }[] = [];

  get modoEdicion(): boolean { return this.pedidoIdEdicion != null; }

  // ── Entrada desde la vitrina ("Pedir este ramo") ────────────────────────
  /**
   * Se llega desde `VitrinaFloresComponent.pedirRamo()` con
   * `router.navigate([...], { state: { ramoArmado } })` — no por query param (`?ramoArmadoId=`),
   * porque no existe un endpoint público para pedir UN `RamoArmado` por id (solo listados
   * paginados) y el objeto ya está completo en memoria en la vitrina al momento del clic.
   *
   * ⚠️ Por venir de `router state`, no sobrevive un F5 a medio armar — si el cliente recarga,
   * el wizard vuelve a Paso 1 en blanco (sin `ramoArmadoOrigen` que precargar). Aceptable: no
   * hay pedido ni cobro de por medio todavía, solo hay que volver a elegir el ramo.
   */
  private ramoArmadoOrigen: IRamoArmado | null = null;
  cargandoRamoArmado = false;
  errorRamoArmado: string | null = null;
  get modoRamoArmado(): boolean { return this.ramoArmadoOrigen != null; }
  get ramoArmadoOrigenNombre(): string { return this.ramoArmadoOrigen?.nombre ?? ''; }

  /**
   * Foto del ramo con el que se llegó desde "Pedir este ramo" — mismo criterio de resolución que
   * `VitrinaFloresComponent.fotoDe()`: la variante sombra primero (foto real, se actualiza sola),
   * `imagenUrl` de respaldo (link viejo pegado a mano) mientras tanto o si no hay variante.
   */
  ramoArmadoOrigenFoto: string | null = null;

  // ── Checkout ─────────────────────────────────────────────────────────────
  guardando = false;
  private idUsuario = 0;
  /** Cliente resuelto al confirmar — se usa para adjuntar su correo al detalle del ramo. */

  private destroy$ = new Subject<void>();

  // ── Fotos de los artículos ────────────────────────────────────────
  /**
   * Foto de cada color/accesorio/frase, indexada por el id de su **producto interno** — que es
   * donde vive la imagen (los artículos de flores no tienen campo propio). Ver
   * `FloresImagenService`.
   *
   * Es solo un adorno para elegir viendo: si no hay foto, o si falla, la pantalla funciona igual.
   */
  portadas: Record<number, string | null> = {};

  constructor(
    private readonly flores: FloresService,
    private readonly imagenes: FloresImagenService,
    private readonly authService: AuthService,
    private readonly usuarioService: UsuarioService,
    private readonly clienteService: ClienteService,
    private readonly lugarEntregaService: LugarEntregaService,
    private readonly varianteService: VarianteService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    // `router.getCurrentNavigation()` (la forma "oficial" de leer state) da `null` acá porque
    // `flores` es un módulo LAZY — para cuando el chunk terminó de descargar y este componente
    // se construye, el Router ya considera la navegación resuelta y borra ese objeto. `history
    // .state` sí sobrevive: Angular lo empuja con `history.pushState` en el momento del
    // `navigate(..., { state })`, y ahí se queda sin importar cuánto tarde el chunk en cargar.
    this.ramoArmadoOrigen = (history.state as { ramoArmado?: IRamoArmado } | undefined)?.ramoArmado ?? null;
  }

  ngOnInit(): void {
    const idEdit = Number(this.route.snapshot.queryParamMap.get('pedidoId'));
    this.pedidoIdEdicion = idEdit > 0 ? idEdit : null;

    this.cargarCatalogo();

    // Foto del ramo de origen — no depende del catálogo, se resuelve aparte para que se vea
    // desde el primer render en vez de esperar a `precargarDesdeRamoArmado()`.
    if (this.ramoArmadoOrigen) {
      this.ramoArmadoOrigenFoto = this.ramoArmadoOrigen.imagenUrl ?? null;
      const varianteId = this.ramoArmadoOrigen.varianteId;
      if (varianteId) {
        this.imagenes.portadaDe(varianteId).pipe(takeUntil(this.destroy$))
          .subscribe(url => { if (url) this.ramoArmadoOrigenFoto = url; });
      }
    }

    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });

    // `GET /v1/lugares-entrega/getAll` ya es público (el back lo abrió a petición nuestra: antes
    // exigía sesión y, como el TokenInterceptor manda al login ante cualquier 401, expulsaba del
    // configurador al visitante sin cuenta). Ahora se pide siempre, como el resto del catálogo.
    this.lugarEntregaService.getAll().subscribe({
      next: d => { this.lugares = d; },
      error: () => { /* opcional — sin zonas el resto del formulario sigue funcionando */ }
    });

    this.recalcular$.pipe(debounceTime(450), takeUntil(this.destroy$)).subscribe(() => this.ejecutarCalculo());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    forkJoin({
      tipos:      this.flores.tiposGetAll(),
      accesorios: this.flores.accesoriosGetAll(),
      frases:     this.flores.frasesGetAll(),
      // Se traen las cantidades para poder decirle al cliente cuánto le va a costar el papel
      // ANTES de que lo marque: el precio del accesorio es por pliego, y cuántos pliegos lleva
      // depende del tamaño del ramo (`CantidadFlorValida.pliegos`). Sin esto, la casilla decía
      // "$5.00" cuando el cobro real de un ramo de 20 son $15 (3 pliegos).
      cantidades: this.flores.cantidadesGetAll()
    }).subscribe({
      next: r => {
        this.tipos      = r.tipos.filter(t => t.activo);
        this.accesorios = r.accesorios.filter(a => a.activo);
        this.frases     = r.frases.filter(f => f.activo);
        this.cantidades = r.cantidades.filter(c => c.activo);
        this.seleccionAccesorios = this.accesorios.map(a => ({ accesorio: a, seleccionado: false, cantidad: 1 }));
        this.cargarPortadas([...this.accesorios, ...this.frases]);
        this.cargandoCatalogo = false;
        // Después del catálogo: sin especies/accesorios cargados no hay contra qué reconstruir.
        if (this.modoEdicion) this.cargarRamoParaEditar();
        else if (this.ramoArmadoOrigen) this.precargarDesdeRamoArmado(this.ramoArmadoOrigen);
      },
      error: err => {
        this.cargandoCatalogo = false;
        this.errorCatalogo = this.msg(err, 'No se pudo cargar el catálogo de flores.');
      }
    });
  }

  /**
   * Reconstruye la pantalla con lo que el cliente ya había pedido.
   *
   * Se hace en cadena y no en paralelo porque cada paso depende del anterior: la especie decide
   * qué colores existen, y sin los colores cargados no se puede repartir la cantidad.
   */
  private cargarRamoParaEditar(): void {
    if (!this.pedidoIdEdicion) return;

    this.cargandoEdicion = true;
    this.errorEdicion = null;

    // Esta ruta es PÚBLICA (el cliente arma su ramo sin cuenta), así que cualquiera podría pegar
    // `?pedidoId=42` y ver precargado el ramo de otra persona. El back rechaza el guardado con
    // 403, pero para entonces ya se vio lo que pidió alguien más.
    //
    // ⚠️ Se espera a que los roles estén resueltos en vez de leer `isAdminService` de golpe: al
    // recargar la pantalla con F5, la sesión se rehidrata con `/auth/refresh` y el rol llega
    // DESPUÉS de que el catálogo terminó de cargar — leerlo antes le diría "no eres admin" a un
    // admin. `userRoles$` es un BehaviorSubject, así que emite de inmediato si ya está listo.
    // El `timeout` no es adorno: un visitante anónimo NUNCA va a tener roles, así que sin él la
    // pantalla se queda colgada en "Cargando el ramo…" para siempre y sin explicación.
    this.authService.userRoles$
      .pipe(filter(r => r.length > 0), take(1), timeout(4000), catchError(() => of([] as string[])),
            takeUntil(this.destroy$))
      .subscribe(roles => {
        if (!roles.includes('ROLE_ADMIN')) {
          this.pedidoIdEdicion = null;
          this.cargandoEdicion = false;
          Swal.fire({
            icon: 'info',
            title: 'Solo un administrador puede editar un pedido',
            text: 'Si quieres cambiar algo de tu ramo, escríbenos y lo ajustamos.'
          });
          return;
        }
        this.pedirRamoDelPedido();
      });
  }

  private pedirRamoDelPedido(): void {
    if (!this.pedidoIdEdicion) return;

    this.flores.obtenerDetalleRamo(this.pedidoIdEdicion).subscribe({
      next: ramo => {
        const especie = ramo.tipoFlorId ?? 0;
        if (!especie) {
          this.cargandoEdicion = false;
          this.errorEdicion = 'Este pedido no trae la especie de flor, no se puede editar desde aquí.';
          return;
        }

        this.tipoSeleccionadoId = especie;
        this.fechaOriginal = ramo.fechaHoraEntrega ?? null;

        this.flores.coloresPorTipoFlor(especie).subscribe({
          next: cs => {
            this.coloresDisponibles = cs;

            const total = (ramo.colores ?? []).reduce((s, c) => s + c.cantidad, 0);
            this.cantidadDeseada    = total;
            this.cantidadConfirmada = total;

            // Un color que se desactivó después de la venta ya no está en `coloresDisponibles` y
            // no se puede volver a mandar (el back lo rechaza). Se cae de la lista y el admin ve
            // que le faltan flores por repartir — pero sin saber cuál era ni cuántas.
            //
            // El nombre sale de `colorNombre` del propio detalle, que el back lee de la relación
            // guardada en el pedido. Buscarlo en el catálogo no sirve: ese endpoint solo trae los
            // activos, así que el color caído justamente no está ahí.
            this.coloresNoDisponibles = (ramo.colores ?? [])
              .filter(x => !cs.some(c => c.id === x.colorFlorId))
              .map(x => ({ nombre: x.colorNombre ?? `Color #${x.colorFlorId}`, cantidad: x.cantidad }));

            this.reparto = cs.map(c => ({
              color: c,
              cantidad: (ramo.colores ?? []).find(x => x.colorFlorId === c.id)?.cantidad ?? 0
            }));
            this.cargarPortadas(cs);

            // El papel no viene en `accesorios` (no es una elección) y se recalcula solo.
            (ramo.accesorios ?? []).forEach(a => {
              const sel = this.seleccionAccesorios.find(s => s.accesorio.id === a.accesorioId);
              if (sel) { sel.seleccionado = true; sel.cantidad = a.cantidad; }
            });

            if (ramo.fechaHoraEntrega) {
              const [f, h] = ramo.fechaHoraEntrega.split('T');
              this.fechaEntrega = f ?? '';
              this.horaEntrega  = (h ?? '').slice(0, 5);
            }
            this.urgente = ramo.esUrgente === true;

            // La zona no se puede cambiar aquí, pero sí tiene que verse: el plazo del taller
            // depende de ella, y un selector vacío haría creer que el ramo no tiene destino.
            this.lugarEntregaId = ramo.lugarEntregaId ?? null;
            this.recogerEnLocal = ramo.recogerEnLocal === true;

            this.cargandoEdicion = false;
            this.consultarFechas();
            this.pedirRecalculo();
          },
          error: err => {
            this.cargandoEdicion = false;
            this.errorEdicion = this.msg(err, 'No se pudieron cargar los colores de este ramo.');
          }
        });
      },
      error: err => {
        this.cargandoEdicion = false;
        this.errorEdicion = this.msg(err, 'No se pudo cargar el ramo de este pedido.');
      }
    });
  }

  /**
   * `IRamoArmado` no trae `tipoFlorId` (solo `colorFlorId` y un `tipoFlorNombre` de exhibición,
   * no un id usable) — pero `fechas-disponibles` sí lo necesita para calcular el plazo de
   * entrega. Sin un endpoint público de "a qué especie pertenece este color", se prueba cada
   * especie activa del catálogo (ya cargado, público, catálogo chico) hasta encontrar la que
   * contenga este color — en paralelo, no uno por uno.
   */
  private resolverTipoFlorId(colorFlorId: number, cb: (tipoFlorId: number | null) => void): void {
    if (!this.tipos.length) { cb(null); return; }
    forkJoin(
      this.tipos.map(t => this.flores.coloresPorTipoFlor(t.id).pipe(
        map(colores => ({ tipoId: t.id, tiene: colores.some(c => c.id === colorFlorId) })),
        catchError(() => of({ tipoId: t.id, tiene: false }))
      ))
    ).subscribe(resultados => {
      const match = resultados.find(r => r.tiene);
      cb(match ? match.tipoId : null);
    });
  }

  /**
   * Entrada alterna al configurador: el cliente eligió un ramo YA ARMADO en la vitrina
   * (`/flores/ramos`, "💐 Pedir este ramo") en vez de construir uno desde cero. Precarga
   * especie/cantidad/reparto/accesorios con lo que trae el `RamoArmado` — mismo patrón que
   * `pedirRamoDelPedido()` (edición admin) arriba, pero sin el candado de admin y sin
   * fecha/zona restauradas (esas todavía no existen: se eligen ahora, como parte de la compra).
   *
   * El reparto y los accesorios quedan EDITABLES a propósito, no bloqueados: el precio final
   * siempre se recalcula en vivo (`calcular-precio`), así que el cliente nunca paga algo
   * distinto de lo que confirma al final, ajuste o no lo que traía el ramo. `precioTotal` del
   * `RamoArmado` es solo el precio de referencia que se vio en la vitrina.
   */
  private precargarDesdeRamoArmado(ramo: IRamoArmado): void {
    this.cargandoRamoArmado = true;
    this.errorRamoArmado = null;
    this.resolverTipoFlorId(ramo.colorFlorId, tipoFlorId => {
      if (!tipoFlorId) {
        this.cargandoRamoArmado = false;
        this.errorRamoArmado = 'No se pudo identificar la especie de este ramo — puedes armarlo manualmente abajo.';
        return;
      }
      this.tipoSeleccionadoId = tipoFlorId;
      this.flores.coloresPorTipoFlor(tipoFlorId).subscribe({
        next: cs => {
          this.coloresDisponibles = cs;
          this.cantidadDeseada = ramo.cantidad;
          this.cantidadConfirmada = ramo.cantidad;
          this.reparto = cs.map(c => ({
            color: c,
            cantidad: c.id === ramo.colorFlorId ? ramo.cantidad : 0
          }));
          this.cargarPortadas(cs);

          (ramo.accesorios ?? []).forEach(a => {
            const sel = this.seleccionAccesorios.find(s => s.accesorio.id === a.accesorioId);
            if (sel) { sel.seleccionado = true; sel.cantidad = a.cantidad; }
          });

          this.cargandoRamoArmado = false;
          this.pedirRecalculo();
        },
        error: err => {
          this.cargandoRamoArmado = false;
          this.errorRamoArmado = this.msg(err, 'No se pudieron cargar los colores de este ramo.');
        }
      });
    });
  }

  // ── Paso 1 — especie ─────────────────────────────────────────────────────

  onCambiarEspecie(): void {
    this.cantidadDeseada = null;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.coloresDisponibles = [];
    this.coloresNoDisponibles = [];
    this.reparto = [];
    this.calculo = null;
    this.limpiarFechas();
    if (!this.tipoSeleccionadoId) return;

    this.cargandoColores = true;
    this.flores.coloresPorTipoFlor(this.tipoSeleccionadoId).subscribe({
      next: cs => { this.coloresDisponibles = cs; this.cargarPortadas(cs); this.cargandoColores = false; },
      error: err => {
        this.cargandoColores = false;
        this.errorCatalogo = this.msg(err, 'No se pudieron cargar los colores de esta especie.');
      }
    });
  }

  /**
   * Pide la foto de cada artículo que tenga producto interno. No bloquea nada ni avisa si falla:
   * es un apoyo visual para elegir, no un dato del pedido.
   */
  private cargarPortadas(articulos: { variante?: { id: number } }[]): void {
    articulos
      .filter(a => !!a?.variante?.id && this.portadas[a.variante!.id] === undefined)
      .forEach(a => {
        const id = a.variante!.id;
        this.portadas[id] = null;                 // marca "ya pedida", para no repetirla
        this.imagenes.portadaDe(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(url => { this.portadas[id] = url; });
      });
  }

  // ── Paso 2 — cantidad ────────────────────────────────────────────────────

  /** Si el cliente cambia el número después de ya haber validado, esa validación queda obsoleta
   * — se limpia todo lo que dependía de ella para forzar un "Validar" nuevo, y que el aviso
   * verde de "cantidad válida" no se quede pegado mostrando un número que ya no es el escrito. */
  onCambiarCantidadDeseada(): void {
    // Al editar hay que recordar lo que YA estaba pactado antes de borrarlo: si no, teclear la
    // cantidad nueva borra el reparto (el admin tendría que capturar de nuevo lo que ya estaba
    // bien) y la fecha (sin ella no hay contra qué comparar para avisar que se corrió).
    if (this.modoEdicion && this.reparto.length) {
      this.repartoPactado = new Map(this.reparto.map(r => [r.color.id, r.cantidad]));
    }

    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.reparto = [];
    this.calculo = null;
    this.limpiarFechas();
  }

  /** El plazo depende del tamaño: si cambia la cantidad o la especie, el anterior ya no vale. */
  private limpiarFechas(): void {
    this.fechas = null;
    this.errorFechas = null;
    this.urgente = false;
    this.fechaEntrega = '';
    this.horaEntrega = '';
  }

  validarCantidad(): void {
    if (!this.tipoSeleccionadoId || !this.cantidadDeseada || this.cantidadDeseada <= 0) return;
    this.validandoCantidad = true;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.reparto = [];
    this.calculo = null;

    this.flores.validarCantidad({ tipoFlorId: this.tipoSeleccionadoId, cantidadSolicitada: this.cantidadDeseada }).subscribe({
      next: r => {
        this.validandoCantidad = false;
        this.resultadoValidacion = r;
        if (r.valida) this.confirmarCantidad(r.cantidadSolicitada);
      },
      error: err => {
        this.validandoCantidad = false;
        Swal.fire({ icon: 'error', title: 'Ups', text: this.msg(err, 'No se pudo validar la cantidad.') });
      }
    });
  }

  /**
   * El texto que acompaña a la cantidad confirmada. Sale del `mensaje` del back, que distingue
   * "se cobra por unidad" (cantidad menor a la más chica registrada) de "forma bien el círculo"
   * (cantidad sí registrada) — una diferencia que le importa al cliente y al dueño.
   *
   * Solo se usa cuando la cantidad confirmada es la que se validó: si el cliente eligió una de
   * las alternativas sugeridas, ese mensaje ya no aplica (hablaba de la cantidad rechazada).
   */
  get mensajeCantidad(): string {
    const r = this.resultadoValidacion;
    const aplica = r && r.cantidadSolicitada === this.cantidadConfirmada;
    return (aplica && r!.mensaje) ? r!.mensaje! : 'cantidad válida';
  }

  /**
   * El cliente decidió seguir con una cantidad que el back marcó como dudosa. No es un error
   * —se puede vender— pero tampoco es un "✅ todo bien": se muestra en tono de aviso para que
   * no crea que el ramo va a quedar como los de tamaño estándar.
   */
  get cantidadConAviso(): boolean {
    const r = this.resultadoValidacion;
    return !!r && !r.valida && r.cantidadSolicitada === this.cantidadConfirmada;
  }

  /**
   * Sigue con la cantidad que el cliente pidió, aunque no sea una de las registradas.
   *
   * El back solo advierte ("puede no quedar bien formado") y acepta cobrarla — verificado contra
   * QA: `calcular-precio` con 22 flores responde 200 y cobra $555. Sin este botón, la pantalla
   * convertía esa advertencia en un bloqueo y obligaba a bajarse a la alternativa más cercana.
   */
  continuarDeTodosModos(): void {
    const n = this.resultadoValidacion?.cantidadSolicitada;
    if (n) this.confirmarCantidad(n);
  }

  usarAlternativa(cantidad: number | null): void {
    if (!cantidad) return;
    this.confirmarCantidad(cantidad);
  }

  private confirmarCantidad(cantidad: number): void {
    this.cantidadConfirmada = cantidad;

    // Al editar se conserva lo que ya estaba repartido: el admin normalmente sube el tamaño para
    // AGREGAR flores, no para rehacer el ramo. El contador de "faltan N" le dice cuántas colocar,
    // en vez de dejarlo con todo en cero y obligarlo a capturar de nuevo lo que ya estaba bien.
    // `repartoPactado` es el respaldo que dejó `onCambiarCantidadDeseada` antes de vaciar la lista.
    const previo = this.modoEdicion
      ? (this.reparto.length ? new Map(this.reparto.map(r => [r.color.id, r.cantidad])) : this.repartoPactado)
      : null;

    this.reparto = this.coloresDisponibles.map(c => ({ color: c, cantidad: previo?.get(c.id) ?? 0 }));
    // Un solo color disponible: se reparte todo ahí de entrada, no tiene caso obligar a
    // escribirlo a mano si no hay entre qué elegir.
    if (this.reparto.length === 1) this.reparto[0].cantidad = cantidad;
    this.actualizarPapelObligatorio();
    this.consultarFechas();
    this.pedirRecalculo();
  }

  // ── Paso 3 — repartir entre colores ──────────────────────────────────────

  get totalRepartido(): number {
    return this.reparto.reduce((s, r) => s + (r.cantidad || 0), 0);
  }

  get restante(): number {
    return (this.cantidadConfirmada ?? 0) - this.totalRepartido;
  }

  get repartoCompleto(): boolean {
    return this.cantidadConfirmada != null && this.restante === 0 && this.totalRepartido > 0;
  }

  onCambiarReparto(r: IRepartoColor): void {
    if (r.cantidad < 0) r.cantidad = 0;
    if (r.cantidad > r.color.stock) r.cantidad = r.color.stock;
    this.pedirRecalculo();
  }

  // ── Paso 4 — accesorios ──────────────────────────────────────────────────

  get accesorioPapel(): IAccesorioRamo | undefined {
    return this.accesorios.find(a => a.esPapel);
  }

  /**
   * Lo que ve el cliente como precio del ramo: las flores **con el papel ya adentro**.
   *
   * Decisión del dueño: *"el papel no se muestra en el armado del ramo para el cliente, va por
   * default si está en el rango pero se cobra internamente"*. Por eso no hay línea de papel en
   * el resumen — pero su costo tiene que estar en algún lado, o las líneas visibles no sumarían
   * el total y el cliente notaría el descuadre.
   */
  get subtotalFlores(): number {
    if (!this.calculo) return 0;
    const papel = this.calculo.papelObligatorioAplicado ? (this.calculo.precioPapel ?? 0) : 0;
    // La mano de obra viaja en `precioManoDeObra` solo como dato informativo, pero el back YA la
    // sumó en `total`. Si no se incluye acá, las líneas visibles dejan de dar el total y el
    // cliente ve un descuadre — el mismo motivo por el que el papel también va aquí adentro.
    const mano = this.calculo.precioManoDeObra ?? 0;
    return this.calculo.precioBase + papel + mano;
  }

  /**
   * Los accesorios que el cliente puede elegir.
   *
   * **El papel solo aparece cuando NO va por default.** La regla del dueño: las cantidades que él
   * dejó configuradas ya llevan papel incluido y el cliente ni se entera (se cobra por dentro);
   * pero si alguien pide una cantidad por debajo de lo configurado, ahí el papel no está previsto
   * y sí hay que preguntárselo — puede querer solo las rosas enrolladas.
   */
  get accesoriosSeleccionables(): { accesorio: IAccesorioRamo; seleccionado: boolean; cantidad: number }[] {
    return this.seleccionAccesorios.filter(s => !(s.accesorio.esPapel && this.papelForzado));
  }

  /** El papel está en la lista (o sea, es una decisión del cliente y no va por default). */
  get papelEsOpcional(): boolean {
    return !!this.accesorioPapel && !this.papelForzado;
  }

  /**
   * `true` cuando el papel va incluido por default — deja de ser una decisión del cliente.
   *
   * **Quien decide es el back**, no esta pantalla: si el front lo escondiera creyendo que va
   * incluido y el back no lo agregara, el ramo saldría sin papel y sin cobro. Por eso, en cuanto
   * hay cálculo, manda `papelObligatorioAplicado` y no la cuenta local.
   *
   * La cuenta local solo sirve de anticipo mientras el cálculo viaja (evita que la casilla
   * aparezca y desaparezca). Replica la misma fórmula del back —**estrictamente mayor**, con
   * umbral 20 un ramo de 20 no lo lleva— justo para que ese anticipo no contradiga lo que llega.
   */
  get papelForzado(): boolean {
    if (this.calculo) return this.calculo.papelObligatorioAplicado === true;
    const papel = this.accesorioPapel;
    if (!papel || papel.umbralActivacion == null || this.cantidadConfirmada == null) return false;
    return this.cantidadConfirmada > papel.umbralActivacion;
  }

  /**
   * El papel ya no se marca desde la lista: el back lo agrega solo cuando la cantidad está en
   * rango. Se deja en `false` a propósito para NO mandarlo en `accesorios` — si se mandara, el
   * back lo dedupe igual (probado: 48 flores con y sin mandarlo dan el mismo total), pero es más
   * limpio no depender de esa deduplicación.
   */
  private actualizarPapelObligatorio(): void {
    const entry = this.seleccionAccesorios.find(s => s.accesorio.esPapel);
    if (entry) entry.seleccionado = false;
  }

  toggleAccesorio(_entry: IAccesorioSeleccion): void {
    this.pedirRecalculo();
  }

  onCambiarCantidadAccesorio(): void {
    this.pedirRecalculo();
  }

  // ── Paso 5 — listón ──────────────────────────────────────────────────────

  onCambiarListon(): void {
    this.pedirRecalculo();
  }

  // ── Paso 6 — entrega ─────────────────────────────────────────────────────

  onRecogerEnLocalChange(): void {
    if (this.recogerEnLocal) {
      this.lugarEntregaId = null;
      this.latitud = null;
      this.longitud = null;
      this.centroMapaLugar = CENTRO_MAPA_GENERICO;
    }
    this.consultarFechas();
  }

  onLugarChange(): void {
    if (this.lugarEntregaId) this.recogerEnLocal = false;
    const lugar = this.lugares.find(l => l.id === this.lugarEntregaId);
    this.centroMapaLugar = (lugar?.latitud != null && lugar?.longitud != null)
      ? [lugar.latitud, lugar.longitud]
      : CENTRO_MAPA_GENERICO;
    // La zona puede sumar horas de anticipación, así que el plazo cambia con ella.
    this.consultarFechas();
  }

  /** El cliente pidió (o canceló) la entrega apurada. Cambia la fecha y el cargo. */
  toggleUrgente(): void {
    this.urgente = !this.urgente;
    this.consultarFechas();
  }

  /**
   * Le pregunta al taller desde cuándo puede entregar este tamaño.
   *
   * Solo depende de (especie, cantidad, zona, urgente) — **no** del reparto entre colores, así
   * que se llama al confirmar la cantidad y no en cada tecla del paso 3.
   *
   * ⚠️ Si responde `primeraFechaValida: null`, el ramo **no se puede pedir** (piden más que el
   * tamaño máximo configurado, o urgente en un tamaño que no se puede apurar). Ahí se muestra el
   * `mensaje` del back tal cual y se bloquea el botón de confirmar.
   */
  private consultarFechas(): void {
    if (!this.tipoSeleccionadoId || !this.cantidadConfirmada) return;
    this.consultandoFechas = true;
    this.errorFechas = null;
    this.flores.fechasDisponibles({
      tipoFlorId: this.tipoSeleccionadoId,
      cantidad: this.cantidadConfirmada,
      lugarEntregaId: this.lugarEntregaId ?? null,
      urgente: this.urgente
    }).subscribe({
      next: r => {
        this.consultandoFechas = false;
        this.fechas = r;
        this.avisoFechaCorrida = null;

        if (r.primeraFechaValida) {
          // Al editar, la fecha ya pactada con el cliente NO se pisa mientras siga siendo posible
          // — cambiar un accesorio no tiene por qué mover la entrega. Solo si el ramo creció y el
          // taller ya no llega, se corre y se avisa, que es justo lo que el admin necesita para
          // decirle al cliente "si le agregamos 10, ya no te lo doy el 20, sería el 23".
          //
          // Se compara contra `fechaOriginal` (la del pedido) y no contra `fechaEntrega`: esta
          // última se vacía al teclear una cantidad nueva, así que justo cuando hay algo que
          // avisar ya no habría con qué comparar.
          const pactada = this.modoEdicion
            ? (this.fechaEntrega ? `${this.fechaEntrega}T${this.horaEntrega || '00:00'}` : this.fechaOriginal)
            : null;
          const alcanza = !!pactada && pactada.slice(0, 16) >= r.primeraFechaValida.slice(0, 16);

          if (this.modoEdicion && alcanza && this.fechaEntrega) {
            // se conserva lo que ya estaba
          } else {
            if (this.modoEdicion && pactada && !alcanza) {
              this.avisoFechaCorrida = `Con este cambio el ramo ya no alcanza para el ${this.fechaLegible(pactada)} `
                + `— lo más pronto ahora es el ${this.fechaLegible(r.primeraFechaValida)}`;
            }
            // Se preselecciona lo más pronto posible: es lo que la mayoría quiere, y de paso deja
            // el formulario completo sin que el cliente tenga que elegir nada.
            this.fechaEntrega = r.primeraFechaValida.slice(0, 10);
            this.horaEntrega = r.horasDisponibles?.[0] ?? r.primeraFechaValida.slice(11, 16);
          }
        } else {
          this.fechaEntrega = '';
          this.horaEntrega = '';
          // Pedir urgente un tamaño que no se puede apurar deja el botón encendido y sin fecha:
          // se regresa solo a normal para que el cliente no quede atorado.
          if (this.urgente) this.urgente = false;
        }
        this.pedirRecalculo();
      },
      error: err => {
        this.consultandoFechas = false;
        this.fechas = null;
        this.errorFechas = this.msg(err, 'No se pudo consultar la fecha de entrega.');
      }
    });
  }

  onCambiarFecha(): void { this.pedirRecalculo(); }

  /**
   * El cliente tiene que decir **a dónde va el ramo**: una zona o pasar por él a la tienda.
   * Sin eso no se puede ni entregar ni calcular bien el envío, así que no se deja confirmar.
   */
  get entregaSinDefinir(): boolean {
    return !this.lugarEntregaId && !this.recogerEnLocal;
  }


  /**
   * El cliente pidió entrega urgente, ese tamaño **sí** tiene cargo configurado… y el cálculo
   * volvió sin cobrarlo. O sea: el taller correría el ramo con prisa **gratis**, y encima el
   * pedido nacería de contado en vez de apartado con su 50%.
   *
   * Pasa hoy en QA: `fechas-disponibles` devuelve `cargoUrgencia: 300` y `calcular-precio`, con
   * los mismos datos y en el mismo instante, devuelve `precioUrgencia: null` — el arreglo del
   * back existe pero no está desplegado.
   *
   * No se "arregla" sumando el cargo aquí: el front no puede crear la línea del pedido (no hay
   * variante para la urgencia), así que enseñaría un total distinto al que se cobra. Se prefiere
   * bloquear la venta antes que cobrar de menos.
   *
   * ⚠️ **Se apaga solo** cuando el back empiece a devolver `precioUrgencia` — no hay que acordarse
   * de quitar nada.
   */
  get cargoUrgenteNoAplicado(): boolean {
    return this.urgente
      && !!this.fechas?.cargoUrgencia
      && !!this.calculo
      && !this.calculo.precioUrgencia;
  }

  /** Lo que se manda al back: `2026-08-17T18:00:00`. */
  get fechaHoraEntrega(): string | null {
    return (this.fechaEntrega && this.horaEntrega) ? `${this.fechaEntrega}T${this.horaEntrega}:00` : null;
  }

  /** No se puede entregar antes de esto — alimenta el `min` del calendario. */
  get minFecha(): string {
    return this.fechas?.primeraFechaValida?.slice(0, 10) ?? '';
  }

  /** El taller no puede con este ramo: no hay fecha que ofrecer. */
  get entregaBloqueada(): boolean {
    return !!this.fechas && this.fechas.primeraFechaValida == null;
  }

  /** "domingo 17 de agosto, 6:00 p.m." — el ISO crudo no se le enseña al cliente. */
  fechaLegible(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dia = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dia}, ${hora}`;
  }

  // ── Cálculo en vivo ──────────────────────────────────────────────────────

  pedirRecalculo(): void {
    this.recalcular$.next();
  }

  private ejecutarCalculo(): void {
    if (!this.repartoCompleto) { this.calculo = null; return; }
    const colores = this.reparto.filter(r => r.cantidad > 0).map(r => ({ colorFlorId: r.color.id, cantidad: r.cantidad }));
    if (!colores.length) { this.calculo = null; return; }

    const accesoriosReq: { accesorioId: number }[] = [];
    this.seleccionAccesorios.filter(s => s.seleccionado).forEach(s => {
      // El papel no se pregunta "cuántos" — una sola entrada basta, el back calcula los pliegos.
      const veces = s.accesorio.esPapel ? 1 : Math.max(1, s.cantidad || 1);
      for (let i = 0; i < veces; i++) accesoriosReq.push({ accesorioId: s.accesorio.id });
    });

    const listones: IListonRequest[] = [];
    if (this.listonModo === 'predefinida' && this.fraseSeleccionadaId) {
      listones.push({ fraseListonPredefinidaId: this.fraseSeleccionadaId });
    } else if (this.listonModo === 'personalizada' && this.fraseTexto.trim()) {
      listones.push({ fraseListonPersonalizada: this.fraseTexto.trim() });
    }

    this.calculando = true;
    this.errorCalculo = null;
    this.flores.calcularPrecio({
      colores,
      accesorios: accesoriosReq,
      listones,
      lugarEntregaId: this.lugarEntregaId ?? undefined,
      recogerEnLocal: this.recogerEnLocal || undefined,
      // Sin estos dos, un ramo urgente se entregaría en la fecha apurada pero cobrado como
      // normal y de contado — el cargo y el enganche del 50% dependen de que lleguen aquí.
      fechaHoraEntrega: this.fechaHoraEntrega,
      urgente: this.urgente
    }).subscribe({
      next: r => { this.calculo = r; this.calculando = false; },
      error: err => {
        this.calculando = false;
        this.calculo = null;
        this.errorCalculo = this.msg(err, 'No se pudo calcular el precio con esta combinación.');
      }
    });
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  confirmarPedido(): void {
    if (!this.calculo || this.guardando) return;

    // Editar no crea un pedido nuevo: recotiza el que ya existe. Ni resuelve cliente, ni verifica
    // correo, ni guarda el ticket de producción — de eso ya se encargó la venta original.
    if (this.modoEdicion) { this.confirmarEdicion(); return; }

    // Avisar, no prohibir (misma regla que "Seguir con N" en el paso 2): bloquear en seco impide
    // probar el flujo urgente completo, y el riesgo real solo existe con un cliente de verdad.
    // Quien decide es quien vende.
    if (this.cargoUrgenteNoAplicado) {
      const cargo = this.fechas?.cargoUrgencia ?? 0;
      Swal.fire({
        icon: 'warning',
        title: 'La urgencia no se está cobrando',
        html: `<p>Este ramo lleva entrega urgente, pero el sistema <b>no está sumando los
               $${cargo.toFixed(2)}</b> del cargo.</p>
               <p>Además el pedido va a quedar <b>de contado</b>, sin el 50% de anticipo que
               normalmente se pide para apurar un ramo.</p>`,
        showCancelButton: true,
        confirmButtonText: 'Continuar de todos modos',
        cancelButtonText: 'Cancelar'
      }).then(r => { if (r.isConfirmed) this.confirmarPedidoConfirmado(); });
      return;
    }
    this.confirmarPedidoConfirmado();
  }

  /**
   * Guarda los cambios de un ramo ya vendido — `PUT .../editar-ramo`, solo ADMIN.
   *
   * Se le muestra al admin la **diferencia contra lo que ya se cobró**, porque es lo que tiene
   * que negociar con el cliente antes de aceptar: si el ramo sube, la diferencia se cobra con un
   * abono; si baja por debajo de lo ya pagado, el back lo rechaza (no hay reembolso).
   */
  private confirmarEdicion(): void {
    if (!this.calculo || !this.pedidoIdEdicion) return;

    const nuevoTotal = this.calculo.total;
    const cambioFecha = this.fechaHoraEntrega && this.fechaHoraEntrega !== this.fechaOriginal;
    const avisoFecha = cambioFecha
      ? `<p style="margin-top:8px">Nueva fecha de entrega: <b>${this.fechaLegible(this.fechaHoraEntrega!)}</b>.
         Se le avisa al cliente por correo.</p>`
      : '';

    Swal.fire({
      title: 'Guardar los cambios del ramo',
      icon: 'question',
      html: `<p class="fw-bold fs-5">Nuevo total: $${nuevoTotal.toFixed(2)}</p>
             <p style="color:var(--app-text-muted,#6b7280);margin:0">Pedido #${this.pedidoIdEdicion}</p>
             ${avisoFecha}`,
      showCancelButton: true,
      confirmButtonText: 'Guardar cambios',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.guardando = true;

      const colores = this.reparto.filter(x => x.cantidad > 0)
        .map(x => ({ colorFlorId: x.color.id, cantidad: x.cantidad }));

      // Una entrada por unidad, igual que `calcular-precio`. El papel NO va aquí: lo recalcula el
      // back según la cantidad nueva de flores.
      const accesorios: { accesorioId: number }[] = [];
      this.seleccionAccesorios
        .filter(s => s.seleccionado && !s.accesorio.esPapel)
        .forEach(s => { for (let i = 0; i < (s.cantidad || 1); i++) accesorios.push({ accesorioId: s.accesorio.id }); });

      this.flores.editarRamo(this.pedidoIdEdicion!, {
        colores,
        accesorios,
        // Solo se manda si de verdad cambió: omitida, el back deja la fecha del pedido intacta.
        fechaHoraEntrega: cambioFecha ? this.fechaHoraEntrega : undefined,
        urgente: cambioFecha ? this.urgente : undefined
      }).subscribe({
        next: res => {
          this.guardando = false;
          const dif = res.diferencia;
          const textoDif = dif > 0
            ? `<p style="margin-top:10px">El cliente debe pagar <b>$${dif.toFixed(2)}</b> más.
               Regístralo como abono en <b>Créditos / Abonos</b>.</p>`
            : dif < 0
              ? `<p style="margin-top:10px">El ramo bajó $${Math.abs(dif).toFixed(2)}. No se devuelve dinero.</p>`
              : '';

          Swal.fire({
            icon: 'success',
            title: 'Ramo actualizado',
            html: `<p>Nuevo total: <b>$${res.totalPedidoNuevo.toFixed(2)}</b>
                   (antes $${res.totalPedidoAnterior.toFixed(2)}).</p>${textoDif}`,
            showCancelButton: dif > 0,
            confirmButtonText: dif > 0 ? 'Ir a cobrar la diferencia' : 'Listo',
            cancelButtonText: 'Después'
          }).then(sr => {
            if (dif > 0 && sr.isConfirmed) {
              this.router.navigate(['/abonos'], { queryParams: { pedidoId: this.pedidoIdEdicion } });
            } else {
              this.router.navigate(['/pedidos/mis-pedidos']);
            }
          });
        },
        error: err => {
          this.guardando = false;
          Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: this.msg(err, 'No se pudo actualizar el ramo.') });
        }
      });
    });
  }

  private confirmarPedidoConfirmado(): void {
    if (!this.calculo) return;

    const avisoFrase = this.calculo.tieneListonPendienteValidacion
      ? `<p style="color:#b45309;margin-top:10px">${this.calculo.avisoFrasePendiente ?? 'El precio de tu frase queda pendiente de aprobación.'}</p>`
      : '';

    Swal.fire({
      title: 'Confirmar tu ramo',
      icon: 'question',
      html: `<p class="fw-bold fs-5">Total: $${this.calculo.total.toFixed(2)}</p>${avisoFrase}`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.resolverClienteYGuardar();
    });
  }

  private resolverClienteYGuardar(): void {
    if (this.idUsuario === 0) {
      Swal.fire({
        title: 'Necesitas una cuenta',
        icon: 'info',
        html: '<p>Para pedir tu ramo primero regístrate.</p>',
        showCancelButton: true,
        confirmButtonText: 'Ir a registro',
        cancelButtonText: 'Cancelar'
      }).then(result => { if (result.isConfirmed) this.router.navigate(['/usuarios/registrar']); });
      return;
    }
    this.usuarioService.buscarClientePorIdUsuario(this.idUsuario).subscribe({
      next: (res: any) => {
        if (res) {
          this.guardarPedido(res);
        } else {
          Swal.fire({
            title: 'Completa tu registro',
            icon: 'info',
            html: '<p>Para pedir tu ramo necesitas registrarte como cliente.</p>',
            showCancelButton: true,
            confirmButtonText: 'Registrarme',
            cancelButtonText: 'Cancelar'
          }).then(result => { if (result.isConfirmed) this.router.navigate(['/clientes/agregar']); });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener tu perfil de cliente.' })
    });
  }

  private guardarPedido(clienteId: number): void {
    if (!this.calculo) return;
    this.guardando = true;

    const detalles: IPedidoVarianteDetalleDTO[] = [];

    this.calculo.coloresCalculados.forEach(c => {
      detalles.push({ producto: { id: 0 }, cantidad: c.cantidad, precioUnitario: c.precioUnitario, subTotal: c.subtotal, varianteId: c.varianteId });
    });

    if (this.calculo.papelObligatorioAplicado && this.calculo.papelVarianteId) {
      // ⚠️ Con floresPorPliego configurado, precioPapel es el TOTAL ya multiplicado — el back
      // valida precioUnitario contra el precio de catálogo (que es por pliego), así que aquí
      // SIEMPRE se manda precioUnitarioPapel (o el precio fijo de siempre si no aplica pliegos).
      const cantidad = this.calculo.pliegosPapel ?? 1;
      const precioUnitario = this.calculo.precioUnitarioPapel ?? this.calculo.precioPapel;
      detalles.push({ producto: { id: 0 }, cantidad, precioUnitario, subTotal: precioUnitario * cantidad, varianteId: this.calculo.papelVarianteId });
    }

    this.calculo.accesoriosCalculados.forEach(a => {
      detalles.push({ producto: { id: 0 }, cantidad: a.cantidad, precioUnitario: a.precioUnitario, subTotal: a.subtotal, varianteId: a.varianteId });
    });

    // Solo la frase PREDEFINIDA ya tiene precio/varianteId resuelto — la personalizada queda
    // pendiente de aprobación (sin línea aquí) y se registra aparte con guardarDetalleRamo().
    this.calculo.listonesCalculados.forEach(l => {
      if (l.varianteId && l.precio != null) {
        detalles.push({ producto: { id: 0 }, cantidad: 1, precioUnitario: l.precio, subTotal: l.precio, varianteId: l.varianteId });
      }
    });

    if (this.calculo.costoEnvio != null && this.calculo.envioVarianteId) {
      detalles.push({ producto: { id: 0 }, cantidad: 1, precioUnitario: this.calculo.costoEnvio, subTotal: this.calculo.costoEnvio, varianteId: this.calculo.envioVarianteId });
    }

    // Un ramo urgente nace APARTADO: el cliente deja el 50% de enganche para que el taller lo
    // empiece, no paga el 100% de contado. Para APARTADO el back espera que `estadoPedido` traiga
    // el MISMO valor que `tipoPedido`, no 'Pendiente' (mismo criterio que venta-variante).
    const conAnticipo = this.calculo.requiereAnticipo === true;

    const pedido: IPedidoVarianteDTO = {
      cliente: { id: clienteId },
      tipoPedido: conAnticipo ? 'APARTADO' : 'NORMAL',
      estadoPedido: conAnticipo ? 'APARTADO' : 'Pendiente',
      fechaPedido: new Date().toISOString().split('T')[0],
      observaciones: '',
      lugarEntregaId: this.lugarEntregaId ?? undefined,
      latitud:        this.latitud ?? undefined,
      longitud:       this.longitud ?? undefined,
      referencias:    this.referencias.trim() || undefined,
      detalles
    };

    this.varianteService.guardarPedidoVariante(pedido).subscribe({
      next: (res: any) => {
        if (res?.data != null) {
          this.varianteService.invalidarCache();
          this.finalizarConDetalleRamo(res.data.id);
        } else {
          this.guardando = false;
          Swal.fire({ icon: 'error', title: 'Error', text: res?.mensaje ?? 'No se pudo guardar el pedido.' });
        }
      },
      error: (err) => {
        this.guardando = false;
        const msg: string = err?.error?.mensaje ?? err?.error?.message ?? '';
        if (msg.toLowerCase().includes('verificar')) {
          this.flujoVerificacion(clienteId);
        } else if (msg.toLowerCase().includes('completar tus datos')) {
          Swal.fire({
            icon: 'info', title: 'Completa tu perfil',
            text: 'Necesitamos tu nombre, apellido paterno y teléfono antes de generar un pedido.',
            confirmButtonText: 'Completar datos', showCancelButton: true, cancelButtonText: 'Cancelar'
          }).then(r => { if (r.isConfirmed) this.router.navigate(['/mis-datos']); });
        } else if (msg.toLowerCase().includes('no es valido') || msg.toLowerCase().includes('no es válido')) {
          Swal.fire({
            icon: 'warning', title: 'Precio desactualizado',
            html: `<p>${msg}</p><p>Algo cambió mientras armabas tu ramo — vuelve a intentarlo.</p>`,
            confirmButtonText: 'Reintentar'
          }).then(() => this.pedirRecalculo());
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: msg || 'No se pudo guardar el pedido.' });
        }
      }
    });
  }

  /**
   * Solo hace falta cuando hay algo que guardar que no está ya en las líneas del pedido: frase
   * (predefinida o personalizada), zona de entrega o recoger en local. Si falla, el pedido YA
   * quedó guardado y cobrado bien — no se bloquea ni se asusta al cliente por un detalle de
   * producción que el admin puede completar manualmente después.
   */
  private finalizarConDetalleRamo(pedidoId: number): void {
    const hayFrase = this.listonModo !== 'ninguno';
    const hayEntrega = !!this.lugarEntregaId || this.recogerEnLocal;
    // La fecha OBLIGA a llamar: es en esta llamada donde el back guarda la `fechaLimitePago` y el
    // `cargoUrgenteMonto` del pedido. Sin eso, `revalidar-antes-de-pagar` no tiene contra qué
    // comparar y un pago tardío nunca se recotizaría.
    const hayFecha = !!this.fechaHoraEntrega;
    if (!hayFrase && !hayEntrega && !hayFecha) { this.completarExito(pedidoId); return; }

    const body: IRamoPedidoDetalleRequest = {
      ramoArmadoId: null,
      colores: this.reparto.filter(r => r.cantidad > 0).map(r => ({ colorFlorId: r.color.id, cantidad: r.cantidad })),
      fraseListonPredefinidaId: this.listonModo === 'predefinida' ? this.fraseSeleccionadaId : null,
      fraseListonPersonalizada: this.listonModo === 'personalizada' ? this.fraseTexto.trim() : null,
      lugarEntregaId: this.lugarEntregaId ?? null,
      recogerEnLocal: this.recogerEnLocal,
      latitud: this.latitud,
      longitud: this.longitud,
      referencias: this.referencias.trim() || null,
      fechaHoraEntrega: this.fechaHoraEntrega,
      urgente: this.urgente
    };

    // ⚠️ `correoContacto` es lo que el back usa para avisarle al cliente cuando su frase ya tiene
    // precio. Si no lo mandamos llega `null` y ese correo **nunca sale** — el cliente se queda
    // esperando sin saber cuánto debe. Solo hace falta cuando hay frase.
    // ⚠️ `buscarPorIdCliente/{id}` recibe el id de **USUARIO**, no el de cliente — el nombre del
    // endpoint engaña. Así lo llaman los otros 4 puntos del proyecto (mis-datos, mi-perfil,
    // mis-pedidos, detalle-productos). Mandarle el clienteId traería el cliente equivocado, o
    // ninguno: se le estaría adjuntando al ramo el correo de otra persona.
    if (hayFrase && this.idUsuario) {
      this.clienteService.getDataOneCliente(this.idUsuario).subscribe({
        next: (res: any) => {
          body.correoContacto   = res?.data?.correoElectronico ?? null;
          body.telefonoContacto = res?.data?.numeroTelefonico ?? null;
          this.enviarDetalleRamo(pedidoId, body, hayFrase);
        },
        // Sin contacto se manda igual: perder el aviso es malo, perder la frase es peor.
        error: () => this.enviarDetalleRamo(pedidoId, body, hayFrase)
      });
      return;
    }
    this.enviarDetalleRamo(pedidoId, body, hayFrase);
  }

  private enviarDetalleRamo(pedidoId: number, body: IRamoPedidoDetalleRequest, hayFrase: boolean): void {
    this.flores.guardarDetalleRamo(pedidoId, body).subscribe({
      next: () => this.completarExito(pedidoId),
      error: () => {
        // Tragar el error está bien para la zona o la fecha: el pedido YA quedó cobrado y el
        // admin puede completarlos a mano desde el detalle.
        //
        // ⚠️ Con la frase NO: su texto vive **únicamente** en esta llamada. Si falla, se pierde
        // para siempre (la pantalla se resetea al salir), el ramo se arma sin listón y nadie se
        // entera — ni el cliente, que ya lo dio por hecho, ni el dueño, que nunca la ve en la
        // bandeja. Por eso aquí sí se avisa y se ofrece reintentar.
        if (!hayFrase) { this.completarExito(pedidoId); return; }
        this.avisarFraseNoGuardada(pedidoId, body);
      }
    });
  }

  /**
   * La frase no se pudo guardar. Se le muestra al cliente **su propio texto** para que no se
   * pierda aunque cierre, y se le deja reintentar sin volver a armar el ramo.
   */
  private avisarFraseNoGuardada(pedidoId: number, body: IRamoPedidoDetalleRequest): void {
    const texto = body.fraseListonPersonalizada
      ?? this.frases.find(f => f.id === body.fraseListonPredefinidaId)?.texto
      ?? '';

    Swal.fire({
      icon: 'warning',
      title: 'Tu ramo quedó registrado, pero la frase no',
      html: `<p>El pedido <b>#${pedidoId}</b> está guardado, pero no pudimos guardar la frase del
             listón.</p>` +
            (texto ? `<p>Es esta: <b style="font-style:italic">«${texto}»</b><br>
                      <small>Guárdala por si acaso.</small></p>` : '') +
            `<p>Puedes reintentar ahora o decírnosla cuando confirmemos tu pedido.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Así está bien'
    }).then(r => {
      if (!r.isConfirmed) { this.completarExito(pedidoId); return; }
      this.flores.guardarDetalleRamo(pedidoId, body).subscribe({
        next: () => this.completarExito(pedidoId),
        error: () => this.avisarFraseNoGuardada(pedidoId, body)
      });
    });
  }

  private completarExito(pedidoId: number): void {
    this.guardando = false;
    const provisional = this.calculo?.tieneListonPendienteValidacion;
    const anticipo = this.calculo?.requiereAnticipo ? this.calculo?.montoAnticipoSugerido : null;
    const fecha = this.fechaLegible(this.fechaHoraEntrega);

    Swal.fire({
      icon: 'success',
      title: '¡Tu ramo quedó registrado!',
      html: `<p>Pedido #${pedidoId}</p>` +
            (fecha ? `<p>Entrega: <b>${fecha}</b></p>` : '') +
            // El anticipo NO es dinero extra: es la mitad del total, la otra mitad se paga al
            // entregar. Decirlo evita que el cliente lea "$X más" y se asuste.
            (anticipo != null
              ? `<p style="color:#b45309">Para empezar a armarlo te pedimos <b>$${anticipo.toFixed(2)}</b>
                 de anticipo (la mitad del total). El resto se paga al entregar.</p>`
              : '') +
            (provisional ? `<p style="color:#b45309">${this.calculo?.avisoFrasePendiente ?? 'El precio final de tu frase se confirma pronto.'}</p>` : ''),
      confirmButtonText: 'Ver mis pedidos'
    }).then(() => {
      this.resetTodo();
      this.router.navigate(['/pedidos/mis-pedidos']);
    });
  }

  private resetTodo(): void {
    this.tipoSeleccionadoId = 0;
    this.cantidadDeseada = null;
    this.resultadoValidacion = null;
    this.cantidadConfirmada = null;
    this.coloresDisponibles = [];
    this.reparto = [];
    this.seleccionAccesorios = this.accesorios.map(a => ({ accesorio: a, seleccionado: false, cantidad: 1 }));
    this.listonModo = 'ninguno';
    this.fraseSeleccionadaId = 0;
    this.fraseTexto = '';
    this.lugarEntregaId = null;
    this.recogerEnLocal = false;
    this.latitud = null;
    this.longitud = null;
    this.centroMapaLugar = CENTRO_MAPA_GENERICO;
    this.referencias = '';
    this.calculo = null;
    this.fechas = null;
    this.errorFechas = null;
    this.urgente = false;
    this.fechaEntrega = '';
    this.horaEntrega = '';
    // Limpia el origen "vitrina → ramo armado" — sin esto, tras confirmar un pedido y volver a
    // Paso 1, la pantalla seguiría creyendo que hay un ramo precargado pendiente.
    this.ramoArmadoOrigen = null;
    this.errorRamoArmado = null;
  }

  // ── Verificación de correo — copia exacta del flujo ya probado en
  // venta-variante.component.ts (enviar código → capturarlo → reintentar el pedido) ──────────

  private flujoVerificacion(clienteId: number): void {
    this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
      next: () => this.mostrarSwalCodigo(clienteId),
      error: () => this.mostrarSwalCodigo(clienteId) // mostrar igual aunque falle el envío
    });
  }

  private mostrarSwalCodigo(clienteId: number): void {
    Swal.fire({
      icon: 'info',
      title: 'Verifica tu correo',
      html: `
        <p style="margin-bottom:12px">Tu correo no está verificado.<br>
        Ingresa el código de <strong>6 dígitos</strong> que enviamos a tu correo electrónico.</p>
        <input id="swal-codigo-ramo" type="text" inputmode="numeric" maxlength="6"
               placeholder="123456"
               style="width:160px;text-align:center;font-size:1.4rem;letter-spacing:6px;
                      padding:8px 12px;border:2px solid var(--brand-1);border-radius:8px;outline:none">
        <div id="swal-resend-ramo" style="margin-top:12px;font-size:0.85rem;color:#64748b">
          ¿No llegó?
          <span id="swal-resend-btn-ramo" style="color:var(--brand-1);cursor:pointer;text-decoration:underline">
            Reenviar código
          </span>
        </div>
      `,
      confirmButtonText: 'Verificar',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--brand-1)',
      didOpen: () => {
        const btn = document.getElementById('swal-resend-btn-ramo');
        if (btn) {
          btn.addEventListener('click', () => {
            btn.textContent = 'Enviando…';
            (btn as HTMLElement).style.pointerEvents = 'none';
            this.clienteService.enviarCodigoVerificacion(clienteId).subscribe({
              next: () => { btn.textContent = '¡Enviado!'; },
              error: () => { btn.textContent = 'Reintentar'; (btn as HTMLElement).style.pointerEvents = 'auto'; }
            });
          });
        }
      },
      preConfirm: async () => {
        const codigo = (document.getElementById('swal-codigo-ramo') as HTMLInputElement)?.value ?? '';
        if (codigo.length !== 6) {
          Swal.showValidationMessage('Ingresa los 6 dígitos del código');
          return false;
        }
        try {
          await this.clienteService.verificarCorreo(clienteId, codigo).toPromise();
          return true;
        } catch (err: any) {
          const msg = err?.error?.mensaje ?? err?.error?.message ?? 'Código incorrecto o expirado.';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    }).then(result => {
      if (!result.isConfirmed) {
        // Cerrar el diálogo en silencio dejaba al cliente mirando su ramo sin saber si se
        // registró o no. El pedido NO existe: el back rechazó el guardado por correo sin
        // verificar, así que no se guardó nada. Se le dice, y su ramo sigue armado en pantalla.
        Swal.fire({
          icon: 'info',
          title: 'Tu ramo no se registró',
          html: `<p>Necesitamos verificar tu correo antes de tomar el pedido, así que
                 <b>no guardamos nada</b>.</p>
                 <p>Sigue armado en esta pantalla: pulsa <b>«Confirmar mi ramo»</b> y te mandamos
                 el código otra vez. Pero <b>si sales, tendrás que armarlo de nuevo</b> — y la
                 fecha de entrega se cuenta desde el momento en que confirmas, así que dejarlo
                 para después puede correrla.</p>`,
          confirmButtonText: 'Entendido'
        });
        return;
      }
      Swal.fire({
        icon: 'success',
        title: '¡Correo verificado!',
        text: 'Ahora registraremos tu ramo.',
        timer: 1800,
        showConfirmButton: false
      }).then(() => this.guardarPedido(clienteId));
    });
  }

  // ── Helpers de template ──────────────────────────────────────────────────

  nombreTipo(id: number): string {
    return this.tipos.find(t => t.id === id)?.nombre ?? '—';
  }

  private msg(err: any, fallback: string): string {
    return err?.error?.mensaje ?? err?.error?.message ?? fallback;
  }
}
