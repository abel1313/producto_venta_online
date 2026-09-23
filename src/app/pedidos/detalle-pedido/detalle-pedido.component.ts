import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IPedidoGenerico } from '../mis-pedidos/models/IPedidoGenerico.model';
import { environment } from 'src/environments/environment';
import { PedidosService } from '../pedidos.service';
import { AbonoService } from 'src/app/abonos/service/abono.service';
import { AbonoRequest, MetodoPago, PedidoDetalleItem, PedidoDetalleResponse } from 'src/app/abonos/models/abono.model';
import { AuthService } from 'src/app/auth/auth.service';
import { NegocioService } from 'src/app/negocio/negocio.service';
import { FloresService } from 'src/app/flores/service/flores.service';
import { onImagenError } from 'src/app/shared/imagen-placeholder';
import Swal from 'sweetalert2';
import { generarHtmlTicket, imprimirTicket, ITicketData } from 'src/app/shared/ticket.util';

import { VarianteService } from 'src/app/variante/service/variante.service';
import { IVarianteResumen } from 'src/app/variante/models/variante.model';
import {
  CambiarTipoPedidoRequest,
  ModoCambio,
  OpcionesPromocion,
  TipoPedido
} from '../models/editar-pedido.model';

import { hoyIso } from '../../shared/fecha.util';
@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit, OnDestroy {
  @Input() pedido!: IPedidoGenerico;
  @Output() regresarProductos = new EventEmitter<boolean>();

  // Base correcta del microservicio de imágenes: GET /v1/imagenes/{productoId}
  public env: string = environment.api_Url + '/v1/imagenes/';

  // ── Detalle rico (promoción, talla/color, fecha+hora, imagen) ────────
  detalle: PedidoDetalleResponse | null = null;
  cargandoDetalle = false;
  imprimiendoTicket = false;

  private qrTienda    = window.location.origin;
  private qrWhatsapp: string | null = null;
  private qrFacebook: string | null = null;
  private qrInstagram: string | null = null;
  private qrTiktok: string | null = null;

  // ── Abono inline ──────────────────────────────────────────────────
  mostrarFormAbono = false;
  registrandoAbono = false;
  idUsuario        = 0;
  readonly metodosAbono: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA'];
  abonoForm: AbonoRequest = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
  montoDado  = 0;
  enviarCorreo = false;

  get correoDisponible(): boolean {
    return !!this.pedido?.cliente?.correoElectronico;
  }

  get isAdmin(): boolean {
    return this.authService.isAdminService;
  }

  /**
   * Quién puede quitar artículos de un pedido ya confirmado.
   *
   * **Solo el admin.** Antes el botón "−" se le mostraba también al cliente, que podía reducir su
   * propio pedido después de confirmarlo — descuadrando lo que el taller va a preparar contra lo
   * que ya se cobró.
   *
   * ⚠️ **En un ramo de flores está bloqueado incluso para el admin**, y no es exceso de celo:
   * `eliminarDetalle` borra una línea suelta sin recalcular nada. En un ramo, quitar flores deja
   * el papel con los pliegos del tamaño viejo, la fecha con el plazo del tamaño viejo y el cargo
   * de urgencia sin revisar — el pedido queda internamente inconsistente y nadie se entera.
   * Editar un ramo de verdad exige rehacer la cotización, que hoy no existe (ver CLAUDE.md).
   */
  get puedeEditarLineas(): boolean {
    return this.isAdmin && !this.esPedidoDeFlores && this.authService.tieneAccion('pedidos/mis-pedidos', 'ajustar-cantidad');
  }

  /**
   * "✏️ Editar ramo" — la única forma correcta de cambiar un ramo ya vendido, porque reabre el
   * configurador y recotiza todo (`PUT .../editar-ramo`), a diferencia del botón "−" que borra
   * una línea suelta sin recalcular nada.
   *
   * Solo ADMIN (el back devuelve 403 a cualquier otro) y solo si el pedido es un ramo. No se
   * bloquea por estado del pedido: el dueño lo pidió explícito ("no importa en qué estado esté").
   * El back sí rechaza un pedido cancelado, y ese mensaje se muestra tal cual.
   */
  get puedeEditarRamo(): boolean {
    return this.isAdmin && this.esPedidoDeFlores && this.authService.tieneAccion('pedidos/mis-pedidos', 'editar-ramo');
  }

  get puedeImprimirTicketDetalle(): boolean {
    return this.isAdmin && this.authService.tieneAccion('pedidos/mis-pedidos', 'imprimir-ticket');
  }

  get puedeReenviarComprobante(): boolean {
    return this.isAdmin && this.authService.tieneAccion('pedidos/mis-pedidos', 'enviar-correo');
  }

  get puedeAbonar(): boolean {
    return this.authService.tieneAccion('pedidos/mis-pedidos', 'abonar');
  }

  // ── Editar un pedido ya creado (2026-09-22) ──────────────────────────────────────
  // Cada botón tiene su propia acción configurable: se le puede dar "agregar" a quien atiende
  // el mostrador sin darle "quitar promoción". Si la migración no corrió, `tieneAccion`
  // devuelve false y el botón ni aparece — mejor que mostrarlo y que el back conteste 403.

  /**
   * Cambiar la forma de cobro es una acción de dinero: mueve el pedido entre Normal, Apartado
   * e Ir pagando y, si el cliente paga en el momento, registra el abono. Por eso NO cuelga del
   * "Editar" general de la pantalla.
   *
   * Bloqueado en ramos por lo mismo que `puedeEditarLineas`: un ramo sin recotizar queda
   * internamente inconsistente.
   */
  get puedeCambiarTipo(): boolean {
    return this.isAdmin && !this.esPedidoDeFlores
        && this.authService.tieneAccion('pedidos/mis-pedidos', 'cambiar-tipo');
  }

  get puedeAgregarArticulo(): boolean {
    return this.isAdmin && !this.esPedidoDeFlores
        && this.authService.tieneAccion('pedidos/mis-pedidos', 'agregar-articulo');
  }

  get puedeCambiarArticulo(): boolean {
    return this.isAdmin && !this.esPedidoDeFlores
        && this.authService.tieneAccion('pedidos/mis-pedidos', 'cambiar-articulo');
  }

  get puedeQuitarPromocion(): boolean {
    return this.isAdmin && !this.esPedidoDeFlores
        && this.authService.tieneAccion('pedidos/mis-pedidos', 'quitar-promocion');
  }

  /** Un pedido entregado o cancelado no se edita — el back también lo rechaza. */
  get pedidoEstaCerrado(): boolean {
    const estado = (this.detalle?.estadoPedido ?? '').toUpperCase();
    return estado === 'ENTREGADO' || estado === 'CANCELADO';
  }

  /**
   * Cobrado de contado y entregado. Su forma de cobro SÍ se puede cambiar, pero solo a crédito:
   * el caso real es una promoción que se registró como efectivo cuando el cliente va pagando.
   */
  get esContadoEntregado(): boolean {
    const estado = (this.detalle?.estadoPedido ?? '').toUpperCase();
    const tipo = (this.tipoActual || 'NORMAL').toUpperCase();
    return estado === 'ENTREGADO' && tipo === 'NORMAL';
  }

  get puedeAbrirFormTipo(): boolean {
    return !this.pedidoEstaCerrado || this.esContadoEntregado;
  }

  /** Unir pedidos: solo los que no estén entregados, cancelados ni ya pagados. */
  get pedidoAbiertoParaUnir(): boolean {
    return !this.pedidoEstaCerrado && (this.detalle?.estadoPedido ?? '').toUpperCase() !== 'PAGADO';
  }

  /** Unir, abonar al grupo o deshacer cambian totales y observaciones: se recarga el detalle. */
  alCambiarGrupo(): void {
    this.cargarDetalleCompleto();
  }

  editarRamo(): void {
    this.router.navigate(['/flores/configurar'], {
      queryParams: { pedidoId: this.detalle?.pedidoId ?? this.pedido?.pedido?.id }
    });
  }

  /**
   * Si el pedido es un ramo. Ahora lo dice el back con `esRamoFlores` (agregado a petición
   * nuestra el 2026-08-16); el parche de mirar el nombre del producto queda solo como respaldo
   * por si se consulta un pedido guardado antes de ese cambio.
   */
  get esPedidoDeFlores(): boolean {
    if (this.detalle?.esRamoFlores != null) return this.detalle.esRamoFlores;
    return (this.detalle?.detalles ?? []).some(d => (d.productoNombre ?? '').includes('[Flores eternas]'));
  }

  /**
   * Las líneas que se muestran. Al cliente **se le esconde el papel** (`esLineaInterna`): va
   * incluido en el ramo, no lo eligió y no lo puede quitar — verlo como renglón suelto solo
   * confunde. El admin sí ve todo, que para eso administra.
   */
  get lineasVisibles(): PedidoDetalleItem[] {
    const todas = this.detalle?.detalles ?? [];
    return this.isAdmin ? todas : todas.filter(d => !d.esLineaInterna);
  }

  /**
   * Se escondió alguna línea, así que el total es mayor que la suma de lo visible. Se avisa con
   * una nota en vez de dejar un descuadre sin explicación — que sería peor que mostrar el papel.
   */
  get hayLineasOcultas(): boolean {
    return (this.detalle?.detalles ?? []).length !== this.lineasVisibles.length;
  }

  /**
   * `[Flores eternas] Flor eternal0 - Roja` → `Flor eternal0 - Roja`.
   *
   * Ese prefijo es de uso interno (marca los productos sombra del módulo para excluirlos de los
   * buscadores) y no tiene por qué salirle al cliente en su pedido.
   */
  nombreVisible(nombre: string | null | undefined): string {
    return (nombre ?? '').replace('[Flores eternas]', '').trim();
  }

  get esCredito(): boolean {
    const tp = this.detalle?.tipoPedido ?? this.pedido?.pedido?.tipoPedido;
    return tp === 'APARTADO' || tp === 'FIADO';
  }

  get estadoPedido(): string {
    return this.detalle?.estadoPedido ?? this.pedido?.pedido?.estado_pedido ?? '';
  }

  // Para crédito, `estadoPedido` crudo del back es 'APARTADO'/'FIADO' (mismo valor que
  // tipoPedido) hasta liquidarlo — mostrarlo tal cual repite el badge de tipo que ya está
  // arriba ("📦 Apartado" seguido de "APARTADO"). Se reemplaza por el estado de pago real.
  get estadoPedidoLabel(): string {
    if (this.esCredito) {
      return this.estadoPedido === 'PAGADO' ? 'Pagado' : 'Por cobrar';
    }
    return this.estadoPedido;
  }

  // "Registrar abono" seguía apareciendo clickeable en un crédito ya liquidado — esCredito
  // solo mira tipoPedido (APARTADO/FIADO), que no cambia al pagarse; hacía falta chequear
  // también el estado. El historial de pagos sí se sigue mostrando (útil de consultar),
  // solo se oculta el botón de registrar uno nuevo.
  /**
   * Link que abre la app de mapas del teléfono con la ruta hacia la entrega, o `null` si no hay
   * a dónde ir.
   *
   * ⚠️ **Esto no usa ninguna API de mapas.** Es una URL normal: el celular la abre con Google
   * Maps o Waze y él pone la navegación. Por eso no cuesta, no pide llave ni cuenta de Google
   * Cloud, y funciona hoy sin nada del back.
   *
   * Hoy va con la **dirección escrita**, que es lo único que se captura — así que atina hasta
   * donde atine el buscador de mapas. Cuando el back agregue `latitud`/`longitud` (pedido el
   * 2026-08-22), aquí se antepone `dir/?api=1&destination={lat},{lng}` y pasa a ser el punto
   * exacto, sin tocar la pantalla.
   */
  // Si el pedido ya tiene ubicación exacta capturada (2026-08-22, ver "Editar Entrega" en
  // mis-pedidos), el botón apunta directo a ese punto con ruta trazada — más preciso que
  // buscar por texto, que depende de qué tan bien escrita quedó la dirección.
  get tieneUbicacionExacta(): boolean {
    return this.vaAlPuntoDeEncuentro
      || (this.detalle?.latitud != null && this.detalle?.longitud != null);
  }

  /**
   * El destino correcto de la ruta depende de quién entrega a quién.
   *
   * Cuando "Entregas por zona" ya programó el viaje, el cliente es quien se mueve: va al punto
   * de encuentro que puso el admin. Trazarle la ruta a `latitud`/`longitud` ahí estaba mal —
   * esas son las coordenadas de SU PROPIA casa, capturadas en el checkout, así que el botón le
   * daba indicaciones para llegar a donde ya está. Sin viaje programado (entrega a domicilio)
   * el destino sigue siendo su dirección, como siempre.
   */
  get vaAlPuntoDeEncuentro(): boolean {
    return this.detalle?.latitudEncuentro != null && this.detalle?.longitudEncuentro != null;
  }

  get linkComoLlegar(): string | null {
    if (this.vaAlPuntoDeEncuentro) {
      return `https://www.google.com/maps/dir/?api=1&destination=${this.detalle!.latitudEncuentro},${this.detalle!.longitudEncuentro}`;
    }
    if (this.detalle?.latitud != null && this.detalle?.longitud != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${this.detalle.latitud},${this.detalle.longitud}`;
    }
    const partes = [this.detalle?.puntoEncuentro, this.detalle?.direccionEntrega, this.detalle?.lugarEntregaNombre]
      .map(p => (p ?? '').trim())
      .filter(p => p !== '');
    if (!partes.length) return null;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`;
  }

  get yaLiquidado(): boolean {
    return this.esCredito && this.estadoPedido === 'PAGADO';
  }

  // Solo se puede imprimir/reenviar el ticket si ya hay algo que cobrar: NORMAL
  // entregado, o crédito con al menos un abono registrado (o ya liquidado).
  get puedeGenerarTicket(): boolean {
    if (!this.detalle) return false;
    if (this.esCredito) {
      return this.estadoPedido === 'PAGADO' || (this.detalle.abonos?.length ?? 0) > 0;
    }
    return this.estadoPedido === 'Entregado' || this.estadoPedido === 'PAGADO';
  }

  get fechaCompra(): string | null {
    return this.detalle?.fechaHoraRegistro ?? this.detalle?.fechaPedido ?? null;
  }

  get cambio(): number {
    return this.montoDado > 0 && this.montoDado > this.abonoForm.monto
      ? +(this.montoDado - this.abonoForm.monto).toFixed(2)
      : 0;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private readonly pedidosService: PedidosService,
    private readonly abonoService:   AbonoService,
    private readonly authService:    AuthService,
    private readonly negocioService: NegocioService,
    private readonly floresService:  FloresService,
    private readonly varianteService: VarianteService,
    private readonly router:         Router
  ) {}

  ngOnInit(): void {
    this.authService.userId$.pipe(takeUntil(this.destroy$)).subscribe(id => { this.idUsuario = id; });

    this.negocioService.getContactosPublicos().subscribe({
      next: c => { this.qrWhatsapp = c.whatsappUrl || null; this.qrFacebook = c.facebookUrl || null; this.qrInstagram = c.instagramUrl || null; this.qrTiktok = c.tiktokUrl || null; if (c.tiendaUrl) this.qrTienda = c.tiendaUrl; },
      error: () => {}
    });

    this.cargarDetalleCompleto();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private cargarDetalleCompleto(): void {
    this.cargandoDetalle = true;
    this.pedidosService.getDetallePedido(this.pedido.pedido.id).subscribe({
      next: r => {
        this.detalle = r?.data ?? null;
        this.cargandoDetalle = false;
      },
      error: () => { this.cargandoDetalle = false; }
    });
  }

  get totalGeneral(): number {
    return this.detalle?.totalPedido
      ?? this.pedido.pedido.detalles.reduce((sum, d) => sum + d.sub_total, 0);
  }

  eliminando = new Set<PedidoDetalleItem>();

  /**
   * El botón "−".
   *
   * ⚠️ **Cambio 2026-09-22:** una línea que es parte de una promoción ya no se puede quitar
   * sola. Antes se podía, y el resto del combo se quedaba a precio promocional — o sea que se
   * seguía cobrando un descuento por una condición que ya no se cumplía, en silencio. El back
   * ahora lo rechaza; acá lo interceptamos antes de mandarlo para ofrecer la salida correcta
   * en vez de mostrar un error.
   */
  reducirCantidad(item: PedidoDetalleItem): void {
    if (this.eliminando.has(item) || item.productoId == null) return;

    if (item.promocionId) {
      this.ofrecerQuitarPromocionCompleta(item);
      return;
    }

    this.eliminando.add(item);

    this.pedidosService.eliminarDetalle(this.pedido.pedido.id, item.productoId).subscribe({
      next: () => {
        item.cantidad -= 1;
        if (item.cantidad <= 0 && this.detalle) {
          this.detalle.detalles = this.detalle.detalles.filter(d => d !== item);
        } else {
          item.subTotal = item.cantidad * item.precioUnitario;
        }
        // El back ya recalcula totalPedido bien server-side, pero acá no se vuelve a pedir
        // el detalle completo (para no perder el estado de la pantalla) — se recalcula igual
        // localmente sumando los subtotales que quedan, así el total mostrado no se queda viejo.
        if (this.detalle) {
          this.detalle.totalPedido = this.detalle.detalles.reduce((sum, d) => sum + d.subTotal, 0);
        }
        this.eliminando.delete(item);
      },
      error: (err) => {
        this.eliminando.delete(item);
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo eliminar el producto.' });
      }
    });
  }

  // Ver `imagen-placeholder.ts`: apuntaba a un png inexistente y provocaba un bucle infinito de
  // peticiones (50+ vistas en vivo en un pedido de flores, cuyos productos no tienen imagen).
  onImgError = onImagenError;

  irPedido(): void {
    this.regresarProductos.emit(false);
  }

  // ── Abono inline ──────────────────────────────────────────────────

  abrirFormAbono(): void {
    this.abonoForm = { monto: 0, fechaPago: this.hoy(), metodoPago: 'EFECTIVO', nota: '' };
    this.montoDado = 0;
    this.mostrarFormAbono = true;
  }

  cancelarFormAbono(): void {
    this.mostrarFormAbono = false;
  }

  /**
   * Mismo patrón que `/abonos`: revalidar el reloj antes de cobrar. Si es un ramo urgente y el
   * pago llega tarde, el back agrega el cargo y el total sube — cobrar el monto viejo dejaría el
   * pedido corto. Se llama en **todos** los pedidos (el back responde 200 sin cambios para los
   * que no son de flores), y si falla por red se cobra igual.
   *
   * ⚠️ Este es el **segundo** punto de cobro de la app; el otro es `/abonos`. Lo que se toque
   * aquí hay que revisarlo allá y al revés.
   */
  registrarAbono(): void {
    if (this.registrandoAbono) return;
    if (!this.abonoForm.monto || this.abonoForm.monto <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'El monto debe ser mayor a 0.' });
      return;
    }
    this.registrandoAbono = true;
    this.floresService.revalidarAntesDePagar(this.pedido.pedido.id).subscribe({
      next: r => {
        if (!r?.cargoRecienAplicado) { this.ejecutarAbono(); return; }
        this.registrandoAbono = false;
        this.mostrarFormAbono = false;
        Swal.fire({
          icon: 'warning',
          title: 'El total de este pedido cambió',
          html: `<p>${r.mensaje ?? 'Se aplicó el cargo por entrega urgente porque el pago llegó después de la hora límite.'}</p>
                 <p>Nuevo total: <b>$${r.totalActual.toFixed(2)}</b></p>`,
          confirmButtonText: 'Entendido'
        }).then(() => this.cargarDetalleCompleto());
      },
      error: () => { this.ejecutarAbono(); }
    });
  }

  private ejecutarAbono(): void {
    this.registrandoAbono = true;
    const body: AbonoRequest = {
      monto:      this.abonoForm.monto,
      usuarioId:  this.idUsuario,
      fechaPago:  this.abonoForm.fechaPago  || undefined,
      metodoPago: this.abonoForm.metodoPago || undefined,
      nota:       this.abonoForm.nota       || undefined,
      montoDado:  this.abonoForm.metodoPago === 'EFECTIVO' && this.montoDado > 0 ? this.montoDado : undefined
    };
    const correoDisponibleSnap = this.correoDisponible;
    const enviarCorreoSnap     = this.enviarCorreo;
    const pedidoId             = this.pedido.pedido.id;
    // Saldo ANTES de este abono — this.detalle todavía no se recarga (cargarDetalleCompleto()
    // es async, no resuelve a tiempo para el texto del Swal de abajo).
    const totalPedidoSnap      = this.detalle?.totalPedido ?? 0;
    const totalPagadoPrevio    = this.detalle?.totalPagado ?? 0;

    this.abonoService.registrarAbono(pedidoId, body).subscribe({
      next: res => {
        this.registrandoAbono = false;
        const data          = res?.data;
        const cambioMostrar = this.cambio;
        this.mostrarFormAbono = false;
        this.enviarCorreo   = false;
        this.cargarDetalleCompleto();
        // Saldo calculado en local (saldo previo - este abono), no `data.saldoRestante` —
        // visto en vivo, el back podía devolver ese campo reflejando el saldo de ANTES del
        // abono en vez de después, mostrando un mensaje que no cuadraba con lo recién pagado.
        const saldoCalculado = +(totalPedidoSnap - totalPagadoPrevio - body.monto).toFixed(2);
        const liquidado      = data?.estadoPedido === 'PAGADO' || saldoCalculado <= 0;
        const txtCambio      = cambioMostrar > 0 ? ` Cambio al cliente: $${cambioMostrar.toFixed(2)}.` : '';

        const titulo = liquidado ? '¡Pedido liquidado!' : 'Abono registrado';
        const texto  = liquidado
          ? `El pedido #${pedidoId} ha sido liquidado.${txtCambio}`
          : `Saldo restante: $${saldoCalculado.toFixed(2)}.${txtCambio}`;

        Swal.fire({ icon: 'success', title: titulo, text: texto, timer: 3000, showConfirmButton: false }).then(() => {
          if (correoDisponibleSnap && enviarCorreoSnap) {
            // Cliente con correo y checkbox marcado → enviar automáticamente al correo registrado
            this.enviarTicketPorCorreo(pedidoId, this.pedido.cliente.correoElectronico);
          } else if (!correoDisponibleSnap) {
            // Sin correo registrado → preguntar
            this.pedirCorreoPostTransaccion(pedidoId);
          }
        });
      },
      error: err => {
        this.registrandoAbono = false;
        Swal.fire({ icon: 'error', title: 'Error', text: (err?.error?.mensaje ?? err?.error?.message) ?? 'No se pudo registrar el abono.' });
      }
    });
  }

  private pedirCorreoPostTransaccion(pedidoId: number): void {
    Swal.fire({
      title: '📧 ¿Enviar ticket por correo?',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'No, gracias',
      reverseButtons: true,
      inputValidator: v => (v && !v.includes('@')) ? 'Ingresa un correo válido' : null
    }).then(res => {
      if (res.isConfirmed && res.value) this.enviarTicketPorCorreo(pedidoId, res.value);
    });
  }

  private enviarTicketPorCorreo(pedidoId: number, correo: string): void {
    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (d) this.enviarTicketConDetalle(pedidoId, d, correo);
      },
      error: () => {}
    });
  }

  // ── Reenviar ticket: confirma primero con el correo del cliente ────

  reenviarComprobanteManual(): void {
    const pedidoId = this.pedido.pedido.id;
    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        const d = r?.data;
        if (!d) return;
        const correoReg = d.clienteCorreo || this.pedido?.cliente?.correoElectronico || '';
        this.confirmarCorreoYEnviar(pedidoId, d, correoReg);
      },
      error: () => Swal.fire({ title: 'Error', text: 'No se pudo obtener el detalle del pedido.', icon: 'error' })
    });
  }

  private confirmarCorreoYEnviar(pedidoId: number, d: PedidoDetalleResponse, correoReg: string): void {
    if (correoReg) {
      const nombre = d.clienteNombre || this.pedido.cliente.nombreCliente;
      Swal.fire({
        title: '📧 Reenviar ticket',
        html: `¿Enviar el ticket al correo de <b>${nombre}</b>:<br><b>${correoReg}</b>?`,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Sí, enviar',
        denyButtonText: 'Usar otro correo',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) this.enviarTicketConDetalle(pedidoId, d, correoReg);
        else if (res.isDenied) this.pedirCorreoManualYEnviar(pedidoId, d);
      });
    } else {
      this.pedirCorreoManualYEnviar(pedidoId, d);
    }
  }

  private pedirCorreoManualYEnviar(pedidoId: number, d: PedidoDetalleResponse): void {
    Swal.fire({
      title: '📧 Reenviar comprobante',
      input: 'email',
      inputPlaceholder: 'correo@ejemplo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: v => (!v || !v.includes('@')) ? 'Ingresa un correo válido' : null,
    }).then(res => {
      if (res.isConfirmed && res.value) this.enviarTicketConDetalle(pedidoId, d, res.value as string);
    });
  }

  private enviarTicketConDetalle(pedidoId: number, d: PedidoDetalleResponse, correo: string): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'PAGADO' ? 'liquidado'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const html = generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || this.pedido.cliente.nombreCliente,
      metodoPago:     d.metodoPago ?? '',
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      abonos:         (d.abonos ?? []).map(a => ({ monto: a.monto, fecha: a.fechaPago })),
      articulos:      d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook,
      qrInstagram: this.qrInstagram,
      qrTiktok:  this.qrTiktok
    });
    this.pedidosService.reenviarComprobante(pedidoId, { correo, ticketHtml: html }).subscribe({
      next: (r2: any) => Swal.fire({ title: '✅ Enviado', text: r2?.data ?? `Ticket enviado a ${correo}`, icon: 'success', timer: 2000, showConfirmButton: false }),
      error: err => Swal.fire({ title: 'Error al enviar', text: err?.error?.mensaje ?? 'No se pudo enviar el correo.', icon: 'error' })
    });
  }

  // ── Imprimir ticket (junto a reenviar) ─────────────────────────────

  imprimirTicketDetalle(): void {
    if (this.imprimiendoTicket) return;
    this.imprimiendoTicket = true;
    const pedidoId = this.pedido.pedido.id;

    this.pedidosService.getDetallePedido(pedidoId).subscribe({
      next: r => {
        this.imprimiendoTicket = false;
        const d = r?.data;
        if (!d) {
          Swal.fire({ title: 'No se encontró el detalle del pedido', icon: 'warning' });
          return;
        }

        if (d.metodoPago || d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO') {
          Swal.fire({
            title: `Ticket pedido #${pedidoId}`,
            text: '¿Deseas imprimir el ticket?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '🖨️ Imprimir ticket',
            cancelButtonText: 'Cancelar'
          }).then(res => {
            if (res.isConfirmed) this.imprimirConDetalle(d, d.metodoPago ?? '', d.montoDado ?? null);
          });
          return;
        }

        // Pedido NORMAL antiguo sin metodoPago guardado en BD → preguntar forma de pago
        Swal.fire({
          title: `Ticket pedido #${pedidoId}`,
          text: '¿Cómo se pagó este pedido?',
          icon: 'question',
          input: 'radio',
          inputOptions: { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta' },
          inputValue: 'EFECTIVO',
          showCancelButton: true,
          confirmButtonText: 'Imprimir 🖨️',
          cancelButtonText: 'Cancelar',
          inputValidator: v => (!v ? 'Selecciona la forma de pago' : null)
        }).then(res => {
          if (res.isConfirmed) this.imprimirConDetalle(d, res.value, null);
        });
      },
      error: err => {
        this.imprimiendoTicket = false;
        Swal.fire({ title: 'Error al obtener el pedido', text: err?.error?.mensaje ?? 'No se pudo generar el ticket.', icon: 'error' });
      }
    });
  }

  private imprimirConDetalle(d: PedidoDetalleResponse, metodoPago: string, montoDadoOrig: number | null): void {
    const tipo: ITicketData['tipo'] = d.estadoPedido === 'Entregado' || d.estadoPedido === 'PAGADO' ? 'venta'
      : d.tipoPedido === 'APARTADO' || d.tipoPedido === 'FIADO' ? 'abono' : 'venta';
    const montoDado = metodoPago === 'EFECTIVO' && montoDadoOrig ? montoDadoOrig : null;
    const cambio    = montoDado && montoDado > d.totalPedido ? +(montoDado - d.totalPedido).toFixed(2) : null;
    imprimirTicket(generarHtmlTicket({
      tipo,
      numero:         d.pedidoId,
      fecha:          this.formatearFechaTicket(d),
      cliente:        d.clienteNombre || this.pedido.cliente.nombreCliente,
      metodoPago,
      total:          d.totalPedido,
      totalPagado:    d.totalPagado ?? null,
      saldoPendiente: d.saldoPendiente > 0 ? d.saldoPendiente : null,
      abonos:         (d.abonos ?? []).map(a => ({ monto: a.monto, fecha: a.fechaPago })),
      montoDado,
      cambio,
      articulos: d.detalles.map(det => ({ cantidad: det.cantidad, productoNombre: det.productoNombre, talla: det.talla, subTotal: det.subTotal })),
      qrTienda:   this.qrTienda,
      qrWhatsapp: this.qrWhatsapp,
      qrFacebook: this.qrFacebook,
      qrInstagram: this.qrInstagram,
      qrTiktok:  this.qrTiktok
    }));
  }

  private formatearFechaTicket(d: PedidoDetalleResponse): string | undefined {
    const fecha = d.fechaHoraRegistro || d.fechaPedido;
    if (!fecha) return undefined;
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  private hoy(): string {
    return hoyIso();
  }

  // ════════════════════════════════════════════════════════════════════════════════
  //  Editar un pedido ya creado (2026-09-22)
  // ════════════════════════════════════════════════════════════════════════════════

  // ── 1. Cambiar la forma de cobro ────────────────────────────────────────────────

  mostrarFormTipo = false;
  cambiandoTipo   = false;
  tipoForm: CambiarTipoPedidoRequest = { tipoPedido: 'NORMAL', montoCobrado: 0, descripcion: '' };

  readonly tiposPedido: { valor: TipoPedido; etiqueta: string; ayuda: string }[] = [
    { valor: 'NORMAL',   etiqueta: 'Normal (contado)', ayuda: 'Se paga completo ahora' },
    { valor: 'APARTADO', etiqueta: 'Apartado',         ayuda: 'Abona y se lo lleva al terminar de pagar' },
    { valor: 'FIADO',    etiqueta: 'Ir pagando',       ayuda: 'Se lo lleva ahora y va abonando' }
  ];

  get tipoActual(): string {
    return this.detalle?.tipoPedido ?? this.pedido?.pedido?.tipoPedido ?? '';
  }

  get saldoPendiente(): number {
    return this.detalle?.saldoPendiente ?? 0;
  }

  /**
   * Pasar a contado exige que no quede saldo. Si queda, el monto arranca en el saldo completo
   * para que el admin no tenga que calcularlo de memoria — que es de donde salían los errores.
   */
  get cobroSugerido(): number {
    return this.tipoForm.tipoPedido === 'NORMAL' ? this.saldoPendiente : 0;
  }

  get cambioDejaSaldoSinCobrar(): boolean {
    return this.tipoForm.tipoPedido === 'NORMAL'
        && this.saldoPendiente > 0
        && (this.tipoForm.montoCobrado ?? 0) < this.saldoPendiente;
  }

  abrirFormTipo(): void {
    const actual = (this.tipoActual || 'NORMAL').toUpperCase() as TipoPedido;
    this.tipoForm = {
      tipoPedido:   this.esContadoEntregado ? 'FIADO' : actual === 'NORMAL' ? 'APARTADO' : 'NORMAL',
      montoCobrado: 0,
      descripcion:  ''
    };
    this.tipoForm.montoCobrado = this.cobroSugerido;
    this.mostrarFormTipo = true;
  }

  cancelarFormTipo(): void {
    this.mostrarFormTipo = false;
  }

  /** Al elegir otro tipo se recalcula el monto sugerido: cambia según a dónde va el pedido. */
  seleccionarTipo(valor: TipoPedido): void {
    this.tipoForm.tipoPedido = valor;
    this.tipoForm.montoCobrado = this.cobroSugerido;
  }

  cambiarTipoPedido(): void {
    if (this.cambiandoTipo) return;

    if (this.tipoForm.tipoPedido === (this.tipoActual || '').toUpperCase()) {
      Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'El pedido ya está en esa forma de cobro.' });
      return;
    }

    if (this.cambioDejaSaldoSinCobrar) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta cobrar el saldo',
        text: `Para dejarlo en contado hay que cobrar los ${this.saldoPendiente.toFixed(2)} que quedan.`
      });
      return;
    }

    this.cambiandoTipo = true;
    const body: CambiarTipoPedidoRequest = {
      tipoPedido:   this.tipoForm.tipoPedido,
      montoCobrado: this.tipoForm.montoCobrado || 0,
      descripcion:  (this.tipoForm.descripcion ?? '').trim() || undefined,
      usuarioId:    this.idUsuario || undefined
    };

    this.pedidosService.cambiarTipoPedido(this.pedido.pedido.id, body).subscribe({
      next: r => {
        this.cambiandoTipo   = false;
        this.mostrarFormTipo = false;
        this.detalle = r?.data ?? this.detalle;
        Swal.fire({
          icon: 'success',
          title: 'Forma de cobro actualizada',
          text: (body.montoCobrado ?? 0) > 0
            ? `Quedó como ${this.etiquetaTipo(body.tipoPedido)} y se registró el cobro de ${(body.montoCobrado ?? 0).toFixed(2)}.`
            : `Quedó como ${this.etiquetaTipo(body.tipoPedido)}.`,
          timer: 3000,
          showConfirmButton: false
        }).then(() => this.cargarDetalleCompleto());
      },
      error: err => {
        this.cambiandoTipo = false;
        this.avisarError(err, 'No se pudo cambiar la forma de cobro.');
      }
    });
  }

  etiquetaTipo(valor: string): string {
    return this.tiposPedido.find(t => t.valor === valor)?.etiqueta ?? valor;
  }

  // ── 2. Agregar un artículo ──────────────────────────────────────────────────────

  mostrarBuscadorArticulo = false;
  terminoArticulo         = '';
  resultadosArticulo: IVarianteResumen[] = [];
  buscandoArticulo        = false;
  guardandoArticulo       = false;

  /** La línea que se está reemplazando. `null` = se está agregando uno nuevo. */
  private lineaACambiar: PedidoDetalleItem | null = null;

  get tituloBuscador(): string {
    return this.lineaACambiar ? 'Cambiar por otro artículo' : 'Agregar un artículo';
  }

  abrirBuscadorArticulo(linea: PedidoDetalleItem | null = null): void {
    this.lineaACambiar           = linea;
    this.terminoArticulo         = '';
    this.resultadosArticulo      = [];
    this.mostrarBuscadorArticulo = true;
  }

  cerrarBuscadorArticulo(): void {
    this.mostrarBuscadorArticulo = false;
    this.lineaACambiar           = null;
  }

  /**
   * Menos de 3 caracteres no sale al back: con 1 o 2 el LIKE barre casi todo el catálogo y el
   * resultado no le sirve a nadie (regla de CLAUDE.md). Vacío limpia la lista.
   */
  buscarArticulo(): void {
    const termino = (this.terminoArticulo ?? '').trim();
    if (!termino) { this.resultadosArticulo = []; return; }
    if (termino.length < 3) return;

    this.buscandoArticulo = true;
    this.varianteService.buscar({ termino, pagina: 1, size: 20 }).subscribe({
      next: r => {
        this.resultadosArticulo = (r?.t ?? []) as IVarianteResumen[];
        this.buscandoArticulo   = false;
      },
      // El back contesta 404 cuando no encuentra nada: eso es "sin resultados", no un error.
      error: () => { this.resultadosArticulo = []; this.buscandoArticulo = false; }
    });
  }

  /**
   * El precio que se le va a cobrar: la rebaja si existe, si no el normal.
   *
   * El back solo acepta uno de esos dos — cualquier otro número lo rechaza con 400, que es
   * justo lo que cierra el agujero de mandar el precio desde la pantalla.
   */
  precioACobrar(v: IVarianteResumen): number {
    const rebaja = v.precioRebaja ?? 0;
    return rebaja > 0 ? rebaja : (v.precio ?? 0);
  }

  tieneRebaja(v: IVarianteResumen): boolean {
    return (v.precioRebaja ?? 0) > 0;
  }

  elegirArticulo(v: IVarianteResumen): void {
    if (this.guardandoArticulo) return;
    this.guardandoArticulo = true;

    const pedidoId = this.pedido.pedido.id;
    const body     = { varianteId: v.id, cantidad: 1, precioUnitario: this.precioACobrar(v) };

    const peticion = this.lineaACambiar
      ? this.pedidosService.cambiarArticulo(pedidoId, this.lineaACambiar.id!, body)
      : this.pedidosService.agregarArticulo(pedidoId, body);

    peticion.subscribe({
      next: r => {
        this.guardandoArticulo = false;
        this.detalle = r?.data ?? this.detalle;
        this.cerrarBuscadorArticulo();
        Swal.fire({
          icon: 'success',
          title: this.lineaACambiar ? 'Artículo cambiado' : 'Artículo agregado',
          timer: 1800,
          showConfirmButton: false
        }).then(() => this.cargarDetalleCompleto());
      },
      error: err => {
        this.guardandoArticulo = false;
        // 409 NO es un error: es la pregunta del combo.
        if (err?.status === 409) {
          this.preguntarQueHacerConElCombo(err, v);
          return;
        }
        this.avisarError(err, 'No se pudo guardar el artículo.');
      }
    });
  }

  // ── 3. El combo de promoción: el 409 ────────────────────────────────────────────

  /**
   * El back no elige entre romper el combo y conservarlo porque las dos son decisiones de
   * negocio válidas: contesta 409 con las dos salidas y pregunta.
   *
   * ⚠️ Se mira `err.status`, **no** el `code` del body: en los errores el envelope trae
   * `code: 404` sin importar el status real, por cómo se arma `ResponseGeneric` en el back.
   */
  private preguntarQueHacerConElCombo(err: any, articulo: IVarianteResumen): void {
    const opciones: OpcionesPromocion | null = err?.error?.data ?? null;
    const promo   = opciones?.promocionDescripcion ?? 'la promoción';
    const importe = opciones?.importeDelCombo ?? 0;
    const lineas  = opciones?.lineasDelCombo ?? [];

    const detalleCombo = lineas.length
      ? `<ul style="text-align:left;margin:.6rem 0 0;padding-left:1.1rem">${
          lineas.map(l => `<li>${l.cantidad} × ${l.nombre}</li>`).join('')
        }</ul>`
      : '';

    Swal.fire({
      icon: 'question',
      title: 'Ese artículo rompe la promoción',
      html: `<p><b>${articulo.nombreProducto ?? 'El artículo nuevo'}</b> no es parte de `
          + `<b>${promo}</b>.</p>`
          + `<p style="margin-top:.5rem">Si se queda, el combo ya no se cumple `
          + `(${importe.toFixed(2)} en total):</p>${detalleCombo}`,
      showDenyButton:   true,
      showCancelButton: true,
      confirmButtonText: 'Quitar la promoción',
      denyButtonText:    'Conservarla y agregar aparte',
      cancelButtonText:  'Cancelar',
      reverseButtons: true
    }).then(res => {
      if (res.isConfirmed)   this.reintentarCambio(articulo, 'QUITAR_PROMOCION');
      else if (res.isDenied) this.reintentarCambio(articulo, 'CONSERVAR_PROMOCION');
    });
  }

  /** El mismo request de antes, ahora con la decisión del usuario adentro. */
  private reintentarCambio(v: IVarianteResumen, modo: ModoCambio): void {
    if (!this.lineaACambiar) return;
    this.guardandoArticulo = true;

    this.pedidosService.cambiarArticulo(this.pedido.pedido.id, this.lineaACambiar.id!, {
      varianteId:     v.id,
      cantidad:       1,
      precioUnitario: this.precioACobrar(v),
      modo
    }).subscribe({
      next: r => {
        this.guardandoArticulo = false;
        this.detalle = r?.data ?? this.detalle;
        this.cerrarBuscadorArticulo();
        Swal.fire({
          icon: 'success',
          title: modo === 'QUITAR_PROMOCION' ? 'Promoción quitada' : 'Se agregó aparte',
          text:  modo === 'QUITAR_PROMOCION'
            ? 'Salió el combo completo y entró el artículo nuevo.'
            : 'La promoción quedó intacta y el artículo se sumó aparte.',
          timer: 2600,
          showConfirmButton: false
        }).then(() => this.cargarDetalleCompleto());
      },
      error: err => {
        this.guardandoArticulo = false;
        this.avisarError(err, 'No se pudo aplicar el cambio.');
      }
    });
  }

  // ── 4. Quitar una promoción completa ────────────────────────────────────────────

  /**
   * Lo que se ofrece cuando alguien le da al "−" sobre una línea de promoción. Quitar una sola
   * dejaría el resto del combo a precio promocional sin que se cumpla la condición.
   */
  private ofrecerQuitarPromocionCompleta(item: PedidoDetalleItem): void {
    const promo = item.promocionDescripcion || 'esta promoción';

    if (!this.puedeQuitarPromocion) {
      Swal.fire({
        icon: 'info',
        title: 'Es parte de una promoción',
        text: `"${this.nombreVisible(item.productoNombre)}" viene dentro de ${promo} y no se puede `
            + 'quitar solo. Hay que quitar la promoción completa, y no tenés ese permiso.'
      });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Es parte de una promoción',
      html: `<p>"<b>${this.nombreVisible(item.productoNombre)}</b>" viene dentro de <b>${promo}</b>.</p>`
          + '<p style="margin-top:.5rem">Quitarlo solo dejaría el resto del combo a precio de '
          + 'promoción sin que se cumpla la condición. Hay que quitar <b>la promoción completa</b>.</p>',
      showCancelButton: true,
      confirmButtonText: 'Quitar la promoción completa',
      cancelButtonText:  'Cancelar',
      reverseButtons: true
    }).then(res => {
      if (res.isConfirmed && item.promocionId) this.quitarPromocion(item.promocionId);
    });
  }

  quitandoPromocion = false;

  quitarPromocion(promocionId: number): void {
    if (this.quitandoPromocion) return;
    this.quitandoPromocion = true;

    this.pedidosService.quitarPromocion(this.pedido.pedido.id, promocionId).subscribe({
      next: r => {
        this.quitandoPromocion = false;
        this.detalle = r?.data ?? this.detalle;
        Swal.fire({
          icon: 'success',
          title: 'Promoción quitada',
          text: 'Salieron todas sus líneas y volvió su stock.',
          timer: 2200,
          showConfirmButton: false
        }).then(() => this.cargarDetalleCompleto());
      },
      error: err => {
        this.quitandoPromocion = false;
        this.avisarError(err, 'No se pudo quitar la promoción.');
      }
    });
  }

  /**
   * Un solo lugar para los errores de estos endpoints.
   *
   * El 403 se explica aparte porque su causa casi siempre es la misma y no se adivina: la
   * migración del permiso no corrió, o corrió pero el token es viejo — los permisos viajan
   * dentro del JWT, así que hay que volver a entrar.
   */
  private avisarError(err: any, porDefecto: string): void {
    if (err?.status === 403) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin permiso',
        text: 'Si el permiso ya se dio de alta, cerrá sesión y volvé a entrar: los permisos '
            + 'viajan dentro del token y uno viejo no los trae.'
      });
      return;
    }
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: (err?.error?.mensaje ?? err?.error?.message) ?? porDefecto
    });
  }
}
