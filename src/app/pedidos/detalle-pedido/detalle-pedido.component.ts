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

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.component.html',
  styleUrls: ['./detalle-pedido.component.scss']
})
export class DetallePedidoComponent implements OnInit, OnDestroy {
  @Input() pedido!: IPedidoGenerico;
  @Output() regresarProductos = new EventEmitter<boolean>();

  // Base correcta del microservicio de imágenes: GET /imagen/v1/{productoId}
  public env: string = environment.api_Url + '/imagen/v1/';

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
    return this.isAdmin && !this.esPedidoDeFlores;
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
    return this.isAdmin && this.esPedidoDeFlores;
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
    return this.detalle?.latitud != null && this.detalle?.longitud != null;
  }

  get linkComoLlegar(): string | null {
    if (this.tieneUbicacionExacta) {
      return `https://www.google.com/maps/dir/?api=1&destination=${this.detalle!.latitud},${this.detalle!.longitud}`;
    }
    const partes = [this.detalle?.direccionEntrega, this.detalle?.lugarEntregaNombre]
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

  reducirCantidad(item: PedidoDetalleItem): void {
    if (this.eliminando.has(item) || item.productoId == null) return;
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
    return new Date().toISOString().slice(0, 10);
  }
}
